"""Exercise extraction against the real HTTP client and an isolated Gemini boundary."""

import base64
import importlib
import json
from types import SimpleNamespace

import httpx
import pytest

ACCOUNT = "11111111-1111-4111-8111-111111111111"
CATEGORY = "22222222-2222-4222-8222-222222222222"
CARD = "33333333-3333-4333-8333-333333333333"
CONTEXT = {
    "today": "2026-09-04",
    "locale": "pt-BR",
    "currency": "BRL",
    "accounts": [{"id": ACCOUNT, "name": "Principal"}],
    "categories": [{"id": CATEGORY, "name": "Alimentação"}],
    "cards": [{"id": CARD, "name": "Visa"}],
}
TRANSACTION = {
    "entry_type": "transaction",
    "account_id": ACCOUNT,
    "category_id": CATEGORY,
    "amount": 2590,
    "description": "Almoço",
    "date": "2026-09-04",
    "kind": "expense",
    "currency": "BRL",
    "status": "posted",
}


def envelope(extraction, finish="STOP"):
    return {
        "candidates": [
            {
                "content": {"role": "model", "parts": [{"text": json.dumps(extraction)}]},
                "finishReason": finish,
            }
        ],
        "usageMetadata": {"promptTokenCount": 100, "candidatesTokenCount": 80, "totalTokenCount": 180},
    }


@pytest.fixture
def provider(monkeypatch):
    real_client = httpx.Client

    def build(response_body, status=200, handler=None):
        try:
            gemini = importlib.import_module("app.gemini")
        except ModuleNotFoundError:
            pytest.fail("GeminiExpenseProvider is not implemented")
        monkeypatch.setattr(
            gemini,
            "settings",
            lambda: SimpleNamespace(
                gemini_api_key="test-secret-never-in-url", gemini_model="gemini-test-model"
            ),
        )
        requests = []

        def respond(request):
            requests.append(request)
            if handler:
                return handler(request)
            return httpx.Response(status, json=response_body)

        monkeypatch.setattr(
            gemini.httpx,
            "Client",
            lambda **kwargs: real_client(transport=httpx.MockTransport(respond), **kwargs),
        )
        return gemini.GeminiExpenseProvider(), requests

    return build


def test_audio_http_contract_and_transaction_output(provider):
    adapter, requests = provider(
        envelope(
            {
                **TRANSACTION,
                "needs_clarification": False,
                "question": None,
                "card_id": None,
                "purchase_date": None,
                "installment_count": None,
            }
        )
    )
    assert adapter.extract(b"OggS synthetic audio", CONTEXT) == TRANSACTION
    request = requests[0]
    assert (
        str(request.url)
        == "https://generativelanguage.googleapis.com/v1beta/models/gemini-test-model:generateContent"
    )
    assert request.headers["x-goog-api-key"] == "test-secret-never-in-url"
    payload = json.loads(request.content)
    parts = payload["contents"][0]["parts"]
    assert parts[1]["inlineData"] == {
        "mimeType": "audio/ogg",
        "data": base64.b64encode(b"OggS synthetic audio").decode(),
    }
    assert json.loads(parts[0]["text"]) == CONTEXT
    schema = payload["generationConfig"]["responseJsonSchema"]
    assert payload["generationConfig"]["responseMimeType"] == "application/json"
    assert "amount" in schema["properties"]
    assert payload["systemInstruction"]["parts"][0]["text"]


def test_purchase_output_has_only_purchase_fields(provider):
    purchase = {
        "entry_type": "purchase",
        "card_id": CARD,
        "category_id": CATEGORY,
        "amount": 15000,
        "description": "Tênis",
        "purchase_date": "2026-09-03",
        "installment_count": 3,
    }
    adapter, _ = provider(
        envelope(
            {
                **purchase,
                "needs_clarification": False,
                "question": None,
                "account_id": None,
                "date": None,
                "kind": None,
                "status": None,
                "currency": "BRL",
            }
        )
    )
    assert adapter.extract(b"audio", CONTEXT) == purchase


def test_clarification_preserves_partial_draft_and_sends_text_correction(provider):
    draft = {
        "needs_clarification": True,
        "question": "Qual conta você usou?",
        "entry_type": "transaction",
        "amount": 2590,
        "description": "Almoço",
        "date": "2026-09-04",
    }
    adapter, _ = provider(envelope(draft))
    result = adapter.extract(b"audio", CONTEXT)
    assert result == draft
    adapter, requests = provider(envelope({**TRANSACTION, "needs_clarification": False}))
    context = {**CONTEXT, "pending": result, "message": "Usei a Principal"}
    assert adapter.extract(b"", context) == TRANSACTION
    parts = json.loads(requests[0].content)["contents"][0]["parts"]
    assert len(parts) == 1
    assert json.loads(parts[0]["text"]) == context


def test_missing_amount_becomes_clarification_with_draft(provider):
    incomplete = {k: v for k, v in TRANSACTION.items() if k != "amount"}
    adapter, _ = provider(envelope({**incomplete, "needs_clarification": False}))
    result = adapter.extract(b"audio", CONTEXT)
    assert result["needs_clarification"] is True
    assert result["question"]
    assert result["description"] == "Almoço"
    assert "amount" not in result


@pytest.mark.parametrize(
    "field,value",
    [
        ("amount", 25.90),
        ("amount", "2590"),
        ("amount", True),
        ("amount", 0),
        ("amount", -1),
        ("amount", 10**15 + 1),
        ("account_id", "unknown"),
        ("category_id", "unknown"),
        ("account_id", 123),
        ("date", "2026-02-30"),
        ("kind", "income"),
        ("needs_clarification", "false"),
        ("entry_type", "transfer"),
        ("unexpected", "value"),
    ],
)
def test_rejects_invalid_financial_data_before_return(provider, field, value):
    adapter, _ = provider(envelope({**TRANSACTION, "needs_clarification": False, field: value}))
    with pytest.raises(ValueError):
        adapter.extract(b"audio", CONTEXT)


def test_rejects_unknown_card_in_partial_draft(provider):
    adapter, _ = provider(
        envelope(
            {
                "needs_clarification": True,
                "question": "Qual valor?",
                "entry_type": "purchase",
                "card_id": "unknown",
            }
        )
    )
    with pytest.raises(ValueError):
        adapter.extract(b"audio", CONTEXT)


@pytest.mark.parametrize(
    "body",
    [
        {},
        [],
        {"promptFeedback": {"blockReason": "SAFETY"}},
        envelope({**TRANSACTION, "needs_clarification": False}, "MAX_TOKENS"),
        envelope({**TRANSACTION, "needs_clarification": False}, "SAFETY"),
        envelope([]),
        envelope("not an extraction"),
        {"candidates": [{"finishReason": "STOP", "content": {"parts": [{"text": "{invalid"}]}}]},
        {"candidates": [{"finishReason": "STOP", "content": {"parts": [{"text": "{}", "thought": True}]}}]},
    ],
)
def test_rejects_malformed_refused_and_truncated_responses(provider, body):
    adapter, _ = provider(body)
    with pytest.raises(ValueError):
        adapter.extract(b"audio", CONTEXT)


def test_rate_limit_failure_exposes_no_response_or_credentials(provider):
    adapter, _ = provider({"error": {"message": "test-secret-never-in-url"}}, status=429)
    with pytest.raises(ValueError) as error:
        adapter.extract(b"audio", CONTEXT)
    assert "429" in str(error.value)
    assert "test-secret" not in str(error.value)
    assert error.value.__cause__ is None


def test_network_failure_is_sanitized(provider):
    def fail(request):
        raise httpx.ConnectError("test-secret-never-in-url", request=request)

    adapter, _ = provider({}, handler=fail)
    with pytest.raises(ValueError) as error:
        adapter.extract(b"audio", CONTEXT)
    assert "test-secret" not in str(error.value)
    assert error.value.__suppress_context__


def test_requires_audio_or_text_without_network_call(provider):
    adapter, requests = provider(envelope(TRANSACTION))
    with pytest.raises(ValueError):
        adapter.extract(b"", CONTEXT)
    assert not requests
