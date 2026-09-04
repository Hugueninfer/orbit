from test_api import demo, get


def test_profile_persists_supported_languages_without_changing_currency(client):
    headers = demo(client)
    for locale in ["de-DE", "en-US", "pt-BR"]:
        before = get(client, headers, "/me")
        response = client.patch(
            "/api/v1/me", headers=headers, json={"version": before["version"], "locale": locale}
        )
        assert response.status_code == 200
        after = get(client, headers, "/me")
        assert after["locale"] == locale and after["currency"] == before["currency"]
    assert (
        client.patch(
            "/api/v1/me", headers=headers, json={"version": after["version"], "locale": "xx-YY"}
        ).status_code
        == 422
    )
