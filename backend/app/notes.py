"""Notes use preview-only lists, bounded documents and owner-locked writes."""

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from .clock import clock
from .db import database
from .identity import authenticated
from .models import Note, NoteFolder, User
from .note_document import EMPTY_DOCUMENT, plain_text, validate_document
from .store import idempotent, owned, problem, public, versioned

router = APIRouter(tags=["Notes"])


class FolderBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=120)
    color: str = Field(default="#7692ff", pattern=r"^#[0-9a-fA-F]{6}$")

    @field_validator("name")
    @classmethod
    def nonempty(cls, value):
        if not value.strip():
            raise ValueError("Nome obrigatório.")
        return value.strip()


class FolderEdit(FolderBody):
    version: int = Field(ge=1)


class FolderOut(FolderBody):
    id: UUID
    version: int
    count: int = 0


class NoteBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(default="", max_length=300)
    content: dict = Field(default_factory=lambda: EMPTY_DOCUMENT.copy())
    folder_id: UUID | None = None
    journal_date: date | None = None
    favorite: bool = False

    @field_validator("content")
    @classmethod
    def document(cls, value):
        return validate_document(value)


class NoteEdit(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: int = Field(ge=1)
    title: str | None = Field(default=None, max_length=300)
    content: dict | None = None
    folder_id: UUID | None = None
    journal_date: date | None = None
    favorite: bool | None = None
    trashed: bool | None = None

    @field_validator("content")
    @classmethod
    def document(cls, value):
        if value is None:
            raise ValueError("Documento obrigatório.")
        return validate_document(value)

    @field_validator("title", "favorite", "trashed")
    @classmethod
    def not_null(cls, value):
        if value is None:
            raise ValueError("Valor obrigatório.")
        return value


class NoteSummary(BaseModel):
    id: UUID
    version: int
    title: str
    preview: str
    folder_id: UUID | None
    journal_date: date | None
    favorite: bool
    deleted_at: datetime | None
    updated_at: datetime


class NoteOut(NoteSummary):
    content: dict


class NotePage(BaseModel):
    items: list[NoteSummary]
    has_more: bool


def locked_owner(db, user):
    # Same owner lock also serializes folder moves/deletes and idempotent creation.
    db.execute(select(User.id).where(User.id == user.id).with_for_update())


def note_out(row):
    data = public(row)
    data["preview"] = data.pop("plain_text")[:180]
    return data


@router.get("/note-folders", response_model=list[FolderOut])
def folders(user: User = Depends(authenticated), db: Session = Depends(database, scope="function")):
    counts: dict[UUID | None, int] = {
        key: count
        for key, count in db.execute(
            select(Note.folder_id, func.count())
            .where(Note.owner_id == user.id, Note.deleted_at.is_(None))
            .group_by(Note.folder_id)
        ).all()
    }
    return [
        {**public(row), "count": counts.get(row.id, 0)}
        for row in db.scalars(
            select(NoteFolder).where(NoteFolder.owner_id == user.id).order_by(NoteFolder.name, NoteFolder.id)
        )
    ]


@router.post("/note-folders", response_model=FolderOut, status_code=201)
def create_folder(
    body: FolderBody, user: User = Depends(authenticated), db: Session = Depends(database, scope="function")
):
    locked_owner(db, user)
    if (
        db.scalar(select(func.count()).select_from(NoteFolder).where(NoteFolder.owner_id == user.id)) or 0
    ) >= 100:
        problem(422, "Limite de 100 pastas atingido.")
    row = NoteFolder(owner_id=user.id, **body.model_dump())
    db.add(row)
    db.flush()
    return public(row)


@router.patch("/note-folders/{identifier}", response_model=FolderOut)
def edit_folder(
    identifier: UUID,
    body: FolderEdit,
    user: User = Depends(authenticated),
    db: Session = Depends(database, scope="function"),
):
    locked_owner(db, user)
    row = owned(db, user, "note_folder", identifier)
    versioned(row, body.version)
    row.data = body.model_dump(exclude={"version"})
    row.version += 1
    db.flush()
    return public(row)


@router.delete("/note-folders/{identifier}", status_code=204)
def remove_folder(
    identifier: UUID,
    version: int = Query(ge=1),
    user: User = Depends(authenticated),
    db: Session = Depends(database, scope="function"),
):
    locked_owner(db, user)
    folder = owned(db, user, "note_folder", identifier)
    versioned(folder, version)
    # ORM mutations preserve write budgets and optimistic versions of moved notes.
    for row in db.scalars(select(Note).where(Note.owner_id == user.id, Note.folder_id == identifier)):
        row.folder_id = None
        row.version += 1
        row.updated_at = clock.now()
    db.flush()
    db.delete(folder)
    db.flush()
    return Response(status_code=204)


@router.get("/notes", response_model=NotePage)
def list_notes(
    view: Literal["all", "journal", "favorites", "trash", "unfiled"] = "all",
    folder_id: UUID | None = None,
    q: str = Query(default="", max_length=200),
    offset: int = Query(default=0, ge=0, le=100000),
    limit: int = Query(default=30, ge=1, le=100),
    user: User = Depends(authenticated),
    db: Session = Depends(database, scope="function"),
):
    # Do not fetch rich content for a list; query only bounded previews.
    query = select(
        Note.id,
        Note.version,
        Note.title,
        func.substr(Note.plain_text, 1, 180).label("preview"),
        Note.folder_id,
        Note.journal_date,
        Note.favorite,
        Note.deleted_at,
        Note.updated_at,
    ).where(Note.owner_id == user.id)
    query = query.where(Note.deleted_at.is_not(None) if view == "trash" else Note.deleted_at.is_(None))
    if view == "journal":
        query = query.where(Note.journal_date.is_not(None))
    if view == "favorites":
        query = query.where(Note.favorite.is_(True))
    if view == "unfiled":
        query = query.where(Note.folder_id.is_(None))
    if folder_id:
        query = query.where(Note.folder_id == folder_id)
    if q.strip():
        term = "%" + q.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        query = query.where(
            or_(Note.title.ilike(term, escape="\\"), Note.plain_text.ilike(term, escape="\\"))
        )
    if view == "journal":
        query = query.order_by(Note.journal_date.desc())
    query = query.order_by(Note.updated_at.desc(), Note.id.desc()).offset(offset).limit(limit + 1)
    items = [dict(row) for row in db.execute(query).mappings()]
    return {"items": items[:limit], "has_more": len(items) > limit}


@router.get("/notes/{identifier}", response_model=NoteOut)
def get_note(
    identifier: UUID, user: User = Depends(authenticated), db: Session = Depends(database, scope="function")
):
    return note_out(owned(db, user, "note", identifier))


@router.post("/notes", response_model=NoteOut, status_code=201)
def create_note(
    body: NoteBody,
    request: Request,
    user: User = Depends(authenticated),
    db: Session = Depends(database, scope="function"),
):
    locked_owner(db, user)
    if body.folder_id:
        owned(db, user, "note_folder", body.folder_id)

    def command():
        row = Note(
            owner_id=user.id, **body.model_dump(), plain_text=plain_text(body.content), updated_at=clock.now()
        )
        db.add(row)
        db.flush()
        return note_out(row)

    return idempotent(db, user, request, body.model_dump(mode="json"), command)


@router.patch("/notes/{identifier}", response_model=NoteOut)
def edit_note(
    identifier: UUID,
    body: NoteEdit,
    user: User = Depends(authenticated),
    db: Session = Depends(database, scope="function"),
):
    locked_owner(db, user)
    row = owned(db, user, "note", identifier)
    versioned(row, body.version)
    values = body.model_dump(exclude_unset=True, exclude={"version"})
    if values.get("folder_id"):
        owned(db, user, "note_folder", values["folder_id"])
    if "trashed" in values:
        values["deleted_at"] = clock.now() if values.pop("trashed") else None
    if "content" in values:
        values["plain_text"] = plain_text(values["content"])
    row.data = {**row.data, **values, "updated_at": clock.now()}
    row.version += 1
    db.flush()
    return note_out(row)


@router.delete("/notes/{identifier}", status_code=204)
def delete_note(
    identifier: UUID,
    version: int = Query(ge=1),
    user: User = Depends(authenticated),
    db: Session = Depends(database, scope="function"),
):
    locked_owner(db, user)
    row = owned(db, user, "note", identifier)
    versioned(row, version)
    if row.data["deleted_at"] is None:
        problem(409, "Mova a nota para a lixeira antes de excluir definitivamente.")
    db.delete(row)
    db.flush()
    return Response(status_code=204)
