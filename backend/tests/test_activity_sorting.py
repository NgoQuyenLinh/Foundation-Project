import pytest
from datetime import datetime, timezone
from types import SimpleNamespace
from app.models.document import Document
from app.models.document_stats import DocumentStats


def test_list_documents_trending_sort_order(client, fake_session, monkeypatch):
    """
    Kiểm tra endpoint GET /documents/ với tham số sort=trending
    sắp xếp theo trending_score DESC, created_at DESC và kèm các trường stats.
    """
    now = datetime.now(timezone.utc)
    
    # Giả lập 3 documents và stats tương ứng
    doc1 = Document(
        id=1,
        owner_id=1,
        title="Doc thấp (0 view)",
        file_path="storage/1/doc1.pdf",
        file_type="application/pdf",
        file_size=1000,
        checksum="chk1",
        created_at=now,
        is_important=False,
        is_deleted=False,
        is_orphaned=False,
        is_bundle=False,
    )
    doc2 = Document(
        id=2,
        owner_id=1,
        title="Doc cao (25 view, trending 35.5)",
        file_path="storage/1/doc2.pdf",
        file_type="application/pdf",
        file_size=2000,
        checksum="chk2",
        created_at=now,
        is_important=False,
        is_deleted=False,
        is_orphaned=False,
        is_bundle=False,
    )
    stats2 = DocumentStats(
        document_id=2,
        view_count=25,
        download_count=5,
        save_count=2,
        share_count=1,
        unique_viewers=8,
        trending_score=35.5,
        last_activity_at=now,
    )

    # Giả lập kết quả trả về của db query trong FakeSession
    class MockResult:
        def __init__(self, rows):
            self.rows = rows
        def all(self):
            return self.rows
        def scalar(self):
            return len(self.rows)

    async def mock_execute(query, params=None):
        query_str = str(query).lower()
        if "download_logs" in query_str:
            return MockResult([(2, 10)])
        if "select count(" in query_str:
            return MockResult([2])
        # Query chính: doc2 (trending cao) đứng trước doc1
        return MockResult([(doc2, stats2), (doc1, None)])

    fake_session.execute = mock_execute

    response = client.get("/documents/?sort=trending")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) == 2

    # Doc 2 phải ở vị trí đầu tiên
    first = data["items"][0]
    assert first["id"] == 2
    assert first["trending_score"] == 35.5
    assert first["view_count"] == 25
    assert first["personal_view_count"] == 10

    # Doc 1 ở vị trí thứ 2 với default stats = 0
    second = data["items"][1]
    assert second["id"] == 1
    assert second["trending_score"] == 0.0
    assert second["view_count"] == 0
    assert second["personal_view_count"] == 0
