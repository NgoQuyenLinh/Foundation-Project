def test_search_endpoint(client, monkeypatch):
    from app.routers import search as search_router

    async def fake_search_documents(db, *, owner_id, query, limit=20, **kwargs):
        return [{"id": 1, "title": "Kinh tế vi mô", "owner_id": owner_id}]

    monkeypatch.setattr(search_router, "search_documents", fake_search_documents)
    response = client.get("/search?q=kinh")
    assert response.status_code == 200
    assert response.json()[0]["title"] == "Kinh tế vi mô"
