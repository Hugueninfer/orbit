"""Owner-isolated rich notes and folders."""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision = "c713a0f92d81"
down_revision = "b281fc92d710"
branch_labels = None
depends_on = None


def base(table):
    return [
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("owner_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("owner_id", "id", name=f"uq_{table}_owner_id"),
        sa.CheckConstraint("version > 0", name=f"ck_{table}_version"),
    ]


def upgrade():
    op.create_table(
        "note_folders",
        *base("note_folders"),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("color", sa.String(7), nullable=False),
    )
    op.create_index("ix_note_folders_owner_id", "note_folders", ["owner_id"])
    op.create_table(
        "notes",
        *base("notes"),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("content", postgresql.JSONB(), nullable=False),
        sa.Column("plain_text", sa.String(), nullable=False),
        sa.Column("folder_id", sa.Uuid()),
        sa.Column("journal_date", sa.Date()),
        sa.Column("favorite", sa.Boolean(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["owner_id", "folder_id"], ["note_folders.owner_id", "note_folders.id"], name="fk_notes_folder_id"
        ),
    )
    op.create_index("ix_notes_owner_id", "notes", ["owner_id"])
    op.create_index("ix_notes_owner_updated", "notes", ["owner_id", "updated_at", "id"])
    op.create_index("ix_notes_owner_journal", "notes", ["owner_id", "journal_date"])


def downgrade():
    op.drop_table("notes")
    op.drop_table("note_folders")
