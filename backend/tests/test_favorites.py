# backend/tests/test_favorites.py
import pytest
from datetime import datetime, timezone
from types import SimpleNamespace
from fastapi.testclient import TestClient

from app.main import app
from app.core.dependencies import get_current_user, get_db
from app.models.document import Document
from app.models.favorite import Favorite
from app.models.tag import Tag
from app.models.user import User


class AsyncMockResult:
    def __init__(self, scalar=None, scalars_list=None, all_list=None):
        self._scalar = scalar
        self._scalars_list = scalars_list if scalars_list is not None else []
        self._all_list = all_list if all_list is not None else []

    def scalar_one_or_none(self):
        return self._scalar

    def scalar_one(self):
        return self._scalar

    def scalar(self):
        return self._scalar

    def first(self):
        return self._scalar

    def scalars(self):
        return self

    def all(self):
        if self._all_list:
            return self._all_list
        return self._scalars_list


class MockDbSession:
    def __init__(self):
        self.added = []
        self.deleted = []
        self.query_handlers = []

    def add(self, obj):
        self.added.append(obj)

    async def delete(self, obj):
        self.deleted.append(obj)

    async def commit(self):
        pass

    async def flush(self):
        for item in self.added:
            if hasattr(item, "id") and getattr(item, "id", None) is None:
                item.id = 999

    async def refresh(self, obj):
        pass

    async def execute(self, statement, *args, **kwargs):
        for handler in self.query_handlers:
            res = handler(statement)
            if res is not None:
                return res
        return AsyncMockResult()


@pytest.fixture
def auth_user_1():
    return SimpleNamespace(id=1, username="user1", email="user1@example.com", full_name="User One")


@pytest.fixture
def auth_user_2():
    return SimpleNamespace(id=2, username="user2", email="user2@example.com", full_name="User Two")


@pytest.fixture
def mock_db():
    return MockDbSession()


@pytest.fixture
def test_client(mock_db, auth_user_1):
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: auth_user_1
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


# =========================================================================
# 1. TEST THÊM YÊU THÍCH (POST /favorites)
# =========================================================================


def test_add_favorite_success(test_client, mock_db, auth_user_1):
    now = datetime.now(timezone.utc)
    doc = Document(
        id=10,
        owner_id=auth_user_1.id,
        title="Tài liệu Giải tích",
        is_deleted=False,
        is_orphaned=False,
        is_public=False,
        checksum="hash1",
        file_path="/tmp/test.pdf",
    )

    fav_calls = 0
    fav = Favorite(
        user_id=auth_user_1.id,
        document_id=10,
        reading_status="to_read",
        notes="Ghi chú test",
        created_at=now,
    )
    fav.tags = []

    def handler(stmt):
        nonlocal fav_calls
        sql = str(stmt)
        if "FROM documents" in sql and "documents.id =" in sql:
            return AsyncMockResult(scalar=doc)
        if "FROM favorites" in sql:
            fav_calls += 1
            if fav_calls == 1:
                # First call: check existing -> None
                return AsyncMockResult(scalar=None)
            # Second call: load created favorite
            return AsyncMockResult(scalar=fav)
        return None

    mock_db.query_handlers.append(handler)

    response = test_client.post(
        "/favorites/",
        json={"document_id": 10, "reading_status": "to_read", "notes": "Ghi chú test"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["document_id"] == 10
    assert data["reading_status"] == "to_read"
    assert data["notes"] == "Ghi chú test"


def test_add_favorite_duplicate_returns_409(test_client, mock_db, auth_user_1):
    doc = Document(id=10, owner_id=auth_user_1.id, title="Doc 10", is_deleted=False, is_orphaned=False, checksum="h1", file_path="/p")
    existing_fav = Favorite(user_id=auth_user_1.id, document_id=10, reading_status="to_read")

    def handler(stmt):
        sql = str(stmt)
        if "FROM documents" in sql:
            return AsyncMockResult(scalar=doc)
        if "FROM favorites" in sql:
            return AsyncMockResult(scalar=existing_fav)
        return None

    mock_db.query_handlers.append(handler)

    response = test_client.post("/favorites/", json={"document_id": 10})
    assert response.status_code == 409
    assert "đã có trong danh sách yêu thích" in response.json()["detail"]


def test_add_favorite_nonexistent_document_returns_404(test_client, mock_db):
    mock_db.query_handlers.append(lambda s: AsyncMockResult(scalar=None))
    response = test_client.post("/favorites/", json={"document_id": 9999})
    assert response.status_code == 404
    assert response.json()["detail"] == "Không tìm thấy tài liệu"


def test_add_favorite_deleted_document_returns_404(test_client, mock_db, auth_user_1):
    doc = Document(id=10, owner_id=auth_user_1.id, title="Doc 10", is_deleted=True, checksum="h1", file_path="/p")
    mock_db.query_handlers.append(lambda s: AsyncMockResult(scalar=doc))

    response = test_client.post("/favorites/", json={"document_id": 10})
    assert response.status_code == 404
    assert response.json()["detail"] == "Không tìm thấy tài liệu"


def test_add_favorite_invalid_status_returns_422(test_client):
    response = test_client.post(
        "/favorites/",
        json={"document_id": 10, "reading_status": "invalid_status"},
    )
    assert response.status_code == 422


# =========================================================================
# 2. TEST QUYỀN HẠN: USER A KHÔNG SỬA/XÓA ĐƯỢC CỦA USER B (404)
# =========================================================================


def test_update_favorite_other_user_returns_404(test_client, mock_db):
    # Favorite thuộc user_id = 2, trong khi auth_user_1 có id = 1
    mock_db.query_handlers.append(lambda s: AsyncMockResult(scalar=None))

    response = test_client.patch(
        "/favorites/10",
        json={"reading_status": "reading"},
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Không tìm thấy yêu thích"


def test_delete_favorite_other_user_returns_404(test_client, mock_db):
    mock_db.query_handlers.append(lambda s: AsyncMockResult(scalar=None))

    response = test_client.delete("/favorites/10")
    assert response.status_code == 404
    assert response.json()["detail"] == "Không tìm thấy yêu thích"


# =========================================================================
# 3. TEST CẬP NHẬT & XÓA (PATCH & DELETE /favorites/{document_id})
# =========================================================================


def test_update_favorite_status_and_notes(test_client, mock_db, auth_user_1):
    fav = Favorite(user_id=auth_user_1.id, document_id=10, reading_status="to_read", notes="Ghi chú cũ")
    fav.tags = []

    def handler(stmt):
        if "FROM favorites" in str(stmt):
            return AsyncMockResult(scalar=fav)
        return None

    mock_db.query_handlers.append(handler)

    response = test_client.patch(
        "/favorites/10",
        json={"reading_status": "completed", "notes": "Đã đọc xong"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["reading_status"] == "completed"
    assert data["notes"] == "Đã đọc xong"


def test_delete_favorite_success(test_client, mock_db, auth_user_1):
    fav = Favorite(user_id=auth_user_1.id, document_id=10)

    def handler(stmt):
        if "FROM favorites" in str(stmt):
            return AsyncMockResult(scalar=fav)
        return None

    mock_db.query_handlers.append(handler)

    response = test_client.delete("/favorites/10")
    assert response.status_code == 204
    assert fav in mock_db.deleted


# =========================================================================
# 4. TEST THỐNG KÊ (GET /favorites/stats)
# =========================================================================


def test_get_favorite_stats(test_client, mock_db):
    def handler(stmt):
        if "favorites.reading_status" in str(stmt):
            return AsyncMockResult(scalars_list=["to_read", "to_read", "reading", "completed"])
        return None

    mock_db.query_handlers.append(handler)

    response = test_client.get("/favorites/stats")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 4
    assert data["to_read"] == 2
    assert data["reading"] == 1
    assert data["completed"] == 1


def test_get_favorite_stats_zero_favorites(test_client, mock_db):
    mock_db.query_handlers.append(lambda s: AsyncMockResult(scalars_list=[]))

    response = test_client.get("/favorites/stats")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["to_read"] == 0
    assert data["reading"] == 0
    assert data["completed"] == 0


# =========================================================================
# 5. TEST THẺ YÊU THÍCH (TAGS) & TÁCH THẺ CÁ NHÂN
# =========================================================================


def test_get_favorite_tags_with_autocomplete(test_client, mock_db):
    def handler(stmt):
        return AsyncMockResult(
            all_list=[
                (1, "Toán Cao Cấp", "#2E7D32", 3),
                (2, "Đọc Sau", "#1976D2", 1),
            ]
        )

    mock_db.query_handlers.append(handler)

    response = test_client.get("/favorites/tags?q=Toán")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["name"] == "Toán Cao Cấp"
    assert data[0]["document_count"] == 3


def test_add_tag_by_name_case_insensitive_and_strip_hash(test_client, mock_db, auth_user_1):
    fav = Favorite(user_id=auth_user_1.id, document_id=10, reading_status="to_read")
    fav.tags = []
    existing_tag = Tag(id=5, name="toan cao cap", owner_id=auth_user_1.id, workspace_id=None)

    def handler(stmt):
        sql = str(stmt)
        if "FROM favorites" in sql:
            return AsyncMockResult(scalar=fav)
        if "FROM tags" in sql and "lower(" in sql:
            # Tìm thấy tag trùng tên không phân biệt hoa thường
            return AsyncMockResult(scalar=existing_tag, scalars_list=[existing_tag])
        return None

    mock_db.query_handlers.append(handler)

    response = test_client.post(
        "/favorites/10/tags",
        json={"name": "  #Toan Cao Cap  "},
    )
    assert response.status_code == 200
    assert existing_tag in fav.tags


def test_remove_tag_from_favorite_keeps_original_tag(test_client, mock_db, auth_user_1):
    tag1 = Tag(id=1, name="Tag 1")
    tag2 = Tag(id=2, name="Tag 2")
    fav = Favorite(user_id=auth_user_1.id, document_id=10)
    fav.tags = [tag1, tag2]

    def handler(stmt):
        if "FROM favorites" in str(stmt):
            return AsyncMockResult(scalar=fav)
        return None

    mock_db.query_handlers.append(handler)

    response = test_client.delete("/favorites/10/tags/1")
    assert response.status_code == 204
    # Favorite chỉ còn tag2
    assert len(fav.tags) == 1
    assert fav.tags[0].id == 2
    # Thẻ tag1 không bị gọi delete trên session
    assert tag1 not in mock_db.deleted


# =========================================================================
# 6. TEST DANH SÁCH YÊU THÍCH & PHÂN TRANG (GET /favorites)
# =========================================================================


def test_list_favorites_with_pagination_and_filters(test_client, mock_db, auth_user_1):
    now = datetime.now(timezone.utc)
    owner = User(id=auth_user_1.id, username="user1", full_name="User One")
    doc = Document(
        id=10,
        owner_id=auth_user_1.id,
        title="Tài liệu Học tập",
        is_deleted=False,
        is_orphaned=False,
        is_public=False,
        checksum="h1",
        file_path="/test.pdf",
        created_at=now,
    )
    doc.owner = owner
    fav = Favorite(
        user_id=auth_user_1.id,
        document_id=10,
        reading_status="reading",
        notes="Đang đọc dở",
        created_at=now,
    )
    fav.document = doc
    fav.tags = [Tag(id=1, name="Học Tập")]

    def handler(stmt):
        sql = str(stmt)
        if "count" in sql.lower():
            return AsyncMockResult(scalar=1)
        if "FROM favorites" in sql:
            return AsyncMockResult(scalars_list=[fav])
        return None

    mock_db.query_handlers.append(handler)

    response = test_client.get("/favorites/?reading_status=reading&page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["page"] == 1
    assert data["page_size"] == 10
    assert len(data["items"]) == 1
    assert data["items"][0]["id"] == 10
    assert data["items"][0]["title"] == "Tài liệu Học tập"
    assert data["items"][0]["reading_status"] == "reading"
    assert data["items"][0]["favorite_tags"][0]["name"] == "Học Tập"


def test_list_favorites_user_with_zero_favorites(test_client, mock_db):
    def handler(stmt):
        sql = str(stmt)
        if "count" in sql.lower():
            return AsyncMockResult(scalar=0)
        if "FROM favorites" in sql:
            return AsyncMockResult(scalars_list=[])
        return None

    mock_db.query_handlers.append(handler)

    response = test_client.get("/favorites/")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["items"] == []
    assert data["total_pages"] == 0


# =========================================================================
# 7. TEST LẤY DANH SÁCH ID (GET /favorites/ids)
# =========================================================================


def test_get_favorite_ids_success(test_client, mock_db, auth_user_1):
    doc1 = Document(id=10, owner_id=auth_user_1.id, is_deleted=False, is_orphaned=False, is_public=False)
    doc2 = Document(id=20, owner_id=auth_user_1.id, is_deleted=False, is_orphaned=False, is_public=False)
    fav1 = Favorite(user_id=auth_user_1.id, document_id=10)
    fav1.document = doc1
    fav2 = Favorite(user_id=auth_user_1.id, document_id=20)
    fav2.document = doc2

    mock_db.query_handlers.append(lambda s: AsyncMockResult(scalars_list=[fav1, fav2]))

    response = test_client.get("/favorites/ids")
    assert response.status_code == 200
    data = response.json()
    assert data == [10, 20]


def test_get_favorite_ids_zero_favorites(test_client, mock_db):
    mock_db.query_handlers.append(lambda s: AsyncMockResult(scalars_list=[]))

    response = test_client.get("/favorites/ids")
    assert response.status_code == 200
    assert response.json() == []


def test_favorite_document_out_full_fields(test_client, mock_db, auth_user_1):
    now = datetime.now(timezone.utc)
    owner = User(id=auth_user_1.id, username="user1", full_name="User One")
    doc = Document(
        id=10,
        owner_id=auth_user_1.id,
        title="Tài liệu Chi tiết",
        description="Mô tả chi tiết",
        file_path="/uploads/test.pdf",
        file_type="application/pdf",
        file_size=1024,
        thumbnail_path="/thumbs/10.jpg",
        checksum="checksum_abc_123",
        content="Nội dung OCR",
        metadata_={"pages": 5, "author": "Nguyễn Văn A"},
        is_important=True,
        is_deleted=False,
        is_orphaned=False,
        is_bundle=False,
        created_at=now,
    )
    doc.owner = owner
    doc.tags = [Tag(id=1, name="Tag Doc")]
    fav = Favorite(
        user_id=auth_user_1.id,
        document_id=10,
        reading_status="to_read",
        notes="Ghi chú cá nhân",
        created_at=now,
    )
    fav.document = doc
    fav.tags = [Tag(id=2, name="Tag Fav")]

    def handler(stmt):
        sql = str(stmt)
        if "count" in sql.lower():
            return AsyncMockResult(scalar=1)
        if "FROM favorites" in sql:
            return AsyncMockResult(scalars_list=[fav])
        return None

    mock_db.query_handlers.append(handler)

    response = test_client.get("/favorites/")
    assert response.status_code == 200
    data = response.json()
    item = data["items"][0]

    # Kiểm tra các trường DocumentOut đầy đủ
    assert item["id"] == 10
    assert item["title"] == "Tài liệu Chi tiết"
    assert item["description"] == "Mô tả chi tiết"
    assert item["file_type"] == "application/pdf"
    assert item["file_size"] == 1024
    assert item["checksum"] == "checksum_abc_123"
    assert item["thumbnail_path"] == "/thumbs/10.jpg"
    assert item["content"] == "Nội dung OCR"
    assert item["metadata"] == {"pages": 5, "author": "Nguyễn Văn A"}
    assert item["is_important"] is True
    # Kiểm tra các trường Favorite
    assert item["reading_status"] == "to_read"
    assert item["notes"] == "Ghi chú cá nhân"
    assert len(item["favorite_tags"]) == 1
    assert item["favorite_tags"][0]["name"] == "Tag Fav"



# =========================================================================
# 8. TEST BUNDLE_CHILDREN_COUNT TRONG DANH SÁCH YÊU THÍCH
# =========================================================================


def test_list_favorites_bundle_with_children_count(test_client, mock_db, auth_user_1):
    """Bundle yêu thích có 2 tài liệu con → bundle_children_count = 2."""
    now = datetime.now(timezone.utc)
    owner = User(id=auth_user_1.id, username="user1", full_name="User One")

    bundle_doc = Document(
        id=100,
        owner_id=auth_user_1.id,
        title="Gói tài liệu",
        is_deleted=False,
        is_orphaned=False,
        is_public=False,
        is_bundle=True,
        checksum="bundle_h1",
        file_path="/test_bundle",
        created_at=now,
    )
    bundle_doc.owner = owner
    bundle_doc.tags = []

    fav = Favorite(
        user_id=auth_user_1.id,
        document_id=100,
        reading_status="to_read",
        created_at=now,
    )
    fav.document = bundle_doc
    fav.tags = []

    call_count = 0

    def handler(stmt):
        nonlocal call_count
        sql = str(stmt)
        if "count" in sql.lower() and "bundle_parent_id" not in sql:
            return AsyncMockResult(scalar=1)
        if "bundle_parent_id" in sql and "count" in sql.lower():
            # Trả về 2 tài liệu con cho bundle 100
            return AsyncMockResult(all_list=[(100, 2)])
        if "FROM favorites" in sql:
            return AsyncMockResult(scalars_list=[fav])
        return None

    mock_db.query_handlers.append(handler)

    response = test_client.get("/favorites/")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["is_bundle"] is True
    assert data["items"][0]["bundle_children_count"] == 2


def test_list_favorites_bundle_with_zero_children(test_client, mock_db, auth_user_1):
    """Bundle yêu thích rỗng (0 tài liệu con) → bundle_children_count = 0."""
    now = datetime.now(timezone.utc)
    owner = User(id=auth_user_1.id, username="user1", full_name="User One")

    bundle_doc = Document(
        id=101,
        owner_id=auth_user_1.id,
        title="Gói rỗng",
        is_deleted=False,
        is_orphaned=False,
        is_public=False,
        is_bundle=True,
        checksum="bundle_h2",
        file_path="/test_bundle_empty",
        created_at=now,
    )
    bundle_doc.owner = owner
    bundle_doc.tags = []

    fav = Favorite(
        user_id=auth_user_1.id,
        document_id=101,
        reading_status="to_read",
        created_at=now,
    )
    fav.document = bundle_doc
    fav.tags = []

    def handler(stmt):
        sql = str(stmt)
        if "count" in sql.lower() and "bundle_parent_id" not in sql:
            return AsyncMockResult(scalar=1)
        if "bundle_parent_id" in sql and "count" in sql.lower():
            # Không có tài liệu con → trả về danh sách rỗng
            return AsyncMockResult(all_list=[])
        if "FROM favorites" in sql:
            return AsyncMockResult(scalars_list=[fav])
        return None

    mock_db.query_handlers.append(handler)

    response = test_client.get("/favorites/")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["is_bundle"] is True
    assert data["items"][0]["bundle_children_count"] == 0


def test_list_favorites_non_bundle_no_children_count(test_client, mock_db, auth_user_1):
    """Tài liệu thường (không phải bundle) → bundle_children_count = None."""
    now = datetime.now(timezone.utc)
    owner = User(id=auth_user_1.id, username="user1", full_name="User One")

    normal_doc = Document(
        id=102,
        owner_id=auth_user_1.id,
        title="Tài liệu thường",
        is_deleted=False,
        is_orphaned=False,
        is_public=False,
        is_bundle=False,
        checksum="normal_h1",
        file_path="/test_normal.pdf",
        created_at=now,
    )
    normal_doc.owner = owner
    normal_doc.tags = []

    fav = Favorite(
        user_id=auth_user_1.id,
        document_id=102,
        reading_status="reading",
        created_at=now,
    )
    fav.document = normal_doc
    fav.tags = []

    def handler(stmt):
        sql = str(stmt)
        if "count" in sql.lower() and "bundle_parent_id" not in sql:
            return AsyncMockResult(scalar=1)
        if "FROM favorites" in sql:
            return AsyncMockResult(scalars_list=[fav])
        return None

    mock_db.query_handlers.append(handler)

    response = test_client.get("/favorites/")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["is_bundle"] is False
    assert data["items"][0]["bundle_children_count"] is None


def test_list_favorites_bundle_with_one_child(test_client, mock_db, auth_user_1):
    """Bundle yêu thích có 1 tài liệu con → bundle_children_count = 1."""
    now = datetime.now(timezone.utc)
    owner = User(id=auth_user_1.id, username="user1", full_name="User One")

    bundle_doc = Document(
        id=103,
        owner_id=auth_user_1.id,
        title="Gói 1 tài liệu",
        is_deleted=False,
        is_orphaned=False,
        is_public=False,
        is_bundle=True,
        checksum="bundle_h3",
        file_path="/test_bundle_one",
        created_at=now,
    )
    bundle_doc.owner = owner
    bundle_doc.tags = []

    fav = Favorite(
        user_id=auth_user_1.id,
        document_id=103,
        reading_status="to_read",
        created_at=now,
    )
    fav.document = bundle_doc
    fav.tags = []

    def handler(stmt):
        sql = str(stmt)
        if "count" in sql.lower() and "bundle_parent_id" not in sql:
            return AsyncMockResult(scalar=1)
        if "bundle_parent_id" in sql and "count" in sql.lower():
            return AsyncMockResult(all_list=[(103, 1)])
        if "FROM favorites" in sql:
            return AsyncMockResult(scalars_list=[fav])
        return None

    mock_db.query_handlers.append(handler)

    response = test_client.get("/favorites/")
    assert response.status_code == 200
    data = response.json()
    assert data["items"][0]["bundle_children_count"] == 1
