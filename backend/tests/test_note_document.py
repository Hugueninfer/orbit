import pytest

from app.note_document import validate_document


@pytest.mark.parametrize(
    "content",
    [
        {"type": "doc", "content": [{"type": "text", "text": "not a block"}]},
        {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "heading", "content": []}]}]},
        {"type": "doc", "content": [{"type": "bulletList", "content": [{"type": "paragraph"}]}]},
    ],
)
def test_rejects_documents_the_editor_cannot_read(content):
    with pytest.raises(ValueError):
        validate_document(content)


def test_tiptap_link_with_default_title_is_valid():
    document = {
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [
                    {
                        "type": "text",
                        "text": "Orbit",
                        "marks": [
                            {
                                "type": "link",
                                "attrs": {
                                    "href": "https://example.com",
                                    "target": "_blank",
                                    "rel": "noopener noreferrer nofollow",
                                    "class": None,
                                    "title": None,
                                },
                            }
                        ],
                    }
                ],
            }
        ],
    }
    assert validate_document(document) == document
