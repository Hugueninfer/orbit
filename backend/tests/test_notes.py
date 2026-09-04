from test_api import demo, get


def doc(text):
    return {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": text}]}]}


def create(client, headers, path, body):
    from uuid import uuid4

    r = client.post("/api/v1" + path, headers={**headers, "Idempotency-Key": str(uuid4())}, json=body)
    assert r.status_code == 201, r.text
    return r.json()


def test_notes_isolation_search_and_conflict(client):
    a, b = demo(client), demo(client)
    folder = create(client, a, "/note-folders", {"name": "Faculdade", "color": "#7692ff"})
    note = create(
        client,
        a,
        "/notes",
        {
            "title": "Aula",
            "content": doc("Álgebra linear"),
            "folder_id": folder["id"],
            "journal_date": "2026-09-04",
        },
    )
    assert client.get("/api/v1/notes/" + note["id"], headers=b).status_code == 404
    assert (
        client.patch("/api/v1/notes/" + note["id"], headers=b, json={"version": 1, "title": "X"}).status_code
        == 404
    )
    assert (
        client.post("/api/v1/notes", headers=b, json={"title": "X", "folder_id": folder["id"]}).status_code
        == 404
    )
    result = get(client, a, "/notes?q=linear&view=journal&limit=1")
    assert result["items"][0]["id"] == note["id"]
    assert "content" not in result["items"][0] and result["items"][0]["preview"] == "Álgebra linear"
    r = client.patch("/api/v1/notes/" + note["id"], headers=a, json={"version": 1, "title": "Nova aula"})
    assert r.status_code == 200
    assert (
        client.patch(
            "/api/v1/notes/" + note["id"], headers=a, json={"version": 1, "content": doc("stale")}
        ).status_code
        == 409
    )
    assert get(client, a, "/notes/" + note["id"])["title"] == "Nova aula"


def test_folder_removal_trash_restore_and_reset(client):
    a = demo(client)
    folder = create(client, a, "/note-folders", {"name": "Presentes"})
    note = create(client, a, "/notes", {"title": "Ideias", "folder_id": folder["id"]})
    assert client.delete("/api/v1/note-folders/" + folder["id"] + "?version=1", headers=a).status_code == 204
    n = get(client, a, "/notes/" + note["id"])
    assert n["folder_id"] is None
    assert (
        client.delete("/api/v1/notes/" + n["id"] + "?version=" + str(n["version"]), headers=a).status_code
        == 409
    )
    r = client.patch("/api/v1/notes/" + n["id"], headers=a, json={"version": n["version"], "trashed": True})
    assert r.status_code == 200
    assert any(x["id"] == n["id"] for x in get(client, a, "/notes?view=trash")["items"])
    r = client.patch(
        "/api/v1/notes/" + n["id"], headers=a, json={"version": r.json()["version"], "trashed": False}
    )
    assert r.status_code == 200 and r.json()["deleted_at"] is None
    r = client.patch(
        "/api/v1/notes/" + n["id"], headers=a, json={"version": r.json()["version"], "trashed": True}
    )
    assert (
        client.delete(
            "/api/v1/notes/" + n["id"] + "?version=" + str(r.json()["version"]), headers=a
        ).status_code
        == 204
    )
    assert client.get("/api/v1/notes/" + n["id"], headers=a).status_code == 404


def test_document_validation_and_idempotency(client):
    from uuid import uuid4

    a = demo(client)
    for content in [
        {"type": "doc", "content": [{"type": "script"}]},
        {
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": "x",
                            "marks": [{"type": "link", "attrs": {"href": "javascript:alert(1)"}}],
                        }
                    ],
                }
            ],
        },
        {"type": "doc", "content": [{"type": "paragraph", "attrs": {"onclick": "x"}}]},
        doc("x" * 100001),
    ]:
        assert client.post("/api/v1/notes", headers=a, json={"content": content}).status_code == 422
    key = str(uuid4())
    headers = {**a, "Idempotency-Key": key}
    body = {"title": "One", "content": doc("hello")}
    first = client.post("/api/v1/notes", headers=headers, json=body)
    second = client.post("/api/v1/notes", headers=headers, json=body)
    assert first.status_code == second.status_code == 201
    assert first.json()["id"] == second.json()["id"]
