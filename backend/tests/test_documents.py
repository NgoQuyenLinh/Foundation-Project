from types import SimpleNamespace


def test_upload_document_duplicate_checksum(client, monkeypatch):
    from app.routers import documents as documents_router
    from datetime import datetime, timezone

    async def fake_create_document_from_upload(*args, **kwargs):
        now = datetime.now(timezone.utc)
        return SimpleNamespace(id=1, owner_id=1, title="Doc", description=None, category_id=None, file_path="/tmp/doc.pdf", file_type="application/pdf", file_size=10, checksum="abc", content=None, metadata_=None, search_vector=None, is_important=False, created_at=now, updated_at=now)

    monkeypatch.setattr(documents_router, "create_document_from_upload", fake_create_document_from_upload)
    response = client.post(
        "/documents/upload",
        data={"title": "Doc"},
        files={"file": ("doc.pdf", b"abc", "application/pdf")},
    )
    assert response.status_code == 201


def test_document_out_schema_stats():
    from datetime import datetime, timezone
    from app.schemas.document import DocumentOut

    now = datetime.now(timezone.utc)
    doc_out = DocumentOut(
        id=1,
        owner_id=1,
        title="Test",
        file_path="/tmp/test.pdf",
        checksum="123",
        created_at=now,
        view_count=15,
        download_count=4,
        share_count=2,
    )
    assert doc_out.view_count == 15
    assert doc_out.download_count == 4
    assert doc_out.share_count == 2
    assert doc_out.trending_score == 0.0

