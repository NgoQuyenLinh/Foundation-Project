import pytest
from unittest.mock import MagicMock
from app.services.file_service import remove_file_if_unreferenced


@pytest.mark.asyncio
async def test_remove_file_if_unreferenced(monkeypatch):
    mock_db = MagicMock()
    mock_safe_remove = MagicMock()
    monkeypatch.setattr("app.services.file_service.safe_remove", mock_safe_remove)

    # Trường hợp 1: Còn bản ghi khác tham chiếu (count = 1) -> Không xóa vật lý
    class FakeResultReferenced:
        def scalar(self):
            return 1

    async def fake_execute_ref(*args, **kwargs):
        return FakeResultReferenced()

    mock_db.execute = fake_execute_ref
    await remove_file_if_unreferenced(mock_db, "storage/6/test.pdf", exclude_doc_ids={1})
    assert mock_safe_remove.call_count == 0

    # Trường hợp 2: Không còn ai tham chiếu (count = 0) -> Xóa vật lý
    class FakeResultUnreferenced:
        def scalar(self):
            return 0

    async def fake_execute_unref(*args, **kwargs):
        return FakeResultUnreferenced()

    mock_db.execute = fake_execute_unref
    await remove_file_if_unreferenced(mock_db, "storage/6/test.pdf", exclude_doc_ids={1})
    assert mock_safe_remove.call_count == 1
    mock_safe_remove.assert_called_once_with("storage/6/test.pdf")


def test_personal_documents_filter_isolation(client, fake_session):
    """Xác nhận khi không truyền workspace_id thì câu truy vấn lọc workspace_id IS NULL"""
    res = client.get("/documents/")
    assert res.status_code == 200
    sql_queries = [str(q[0]) for q in fake_session.queries]
    assert any("documents.workspace_id IS NULL" in q for q in sql_queries)


@pytest.mark.asyncio
async def test_local_storage_save_and_url(tmp_path, monkeypatch):
    """Xác nhận khi chạy ở chế độ local thì file được ghi vào đĩa local và URL trả về dạng relative"""
    import io
    from fastapi import UploadFile
    from app.services.file_service import save_upload_file, get_file_url, safe_remove
    from app.core.config import settings

    monkeypatch.setattr(settings, "STORAGE_BACKEND", "local")

    file_content = b"hello local storage test content"
    upload = UploadFile(
        file=io.BytesIO(file_content),
        filename="test_doc.txt"
    )

    file_key = await save_upload_file(upload, owner_id=999)
    try:
        assert file_key.startswith("storage/999/")
        from pathlib import Path
        assert Path(file_key).exists()
        assert Path(file_key).read_bytes() == file_content

        url = get_file_url(file_key)
        assert url == file_key.lstrip('/')
    finally:
        safe_remove(file_key)
        assert not Path(file_key).exists()


