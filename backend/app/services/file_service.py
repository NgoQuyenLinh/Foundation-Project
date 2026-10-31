from __future__ import annotations

import io
import os
import uuid
from pathlib import Path
from typing import TYPE_CHECKING
from fastapi import UploadFile

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings, s3_client
from app.utils.checksum import compute_file_checksum


async def save_upload_file(upload: UploadFile, owner_id: int) -> str:
    """
    Lưu file tải lên: hỗ trợ linh động cả Local Storage và Cloudflare R2.
    Trả về file_key tương đối (VD: storage/6/uuid.docx).
    """
    suffix = Path(upload.filename or "upload.bin").suffix
    safe_name = f"{uuid.uuid4().hex}{suffix}"
    file_key = f"storage/{owner_id}/{safe_name}"

    content = await upload.read()
    await upload.seek(0)

    # 1. Lưu cục bộ nếu STORAGE_BACKEND là "local" hoặc không cấu hình R2
    if getattr(settings, "STORAGE_BACKEND", "local") == "local" or not s3_client:
        dest_path = Path(file_key)
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        dest_path.write_bytes(content)
        return file_key

    # 2. Đẩy lên Cloudflare R2 nếu ở chế độ cloud
    s3_client.put_object(
        Bucket=settings.BUCKET_NAME,
        Key=file_key,
        Body=content,
        ContentType=upload.content_type or "application/octet-stream",
        ContentDisposition=f'inline; filename="{upload.filename}"'
    )

    return file_key


def checksum_for_file(file_input: str | bytes | UploadFile) -> str:
    """
    Tính checksum MD5/SHA256 không cần ghi ổ đĩa local.
    """
    if isinstance(file_input, bytes):
        return compute_file_checksum(io.BytesIO(file_input))
    elif isinstance(file_input, UploadFile):
        # Lưu ý: nếu truyền UploadFile vào đây, đảm bảo đã read() hoặc dùng file.read()
        content = file_input.file.read()
        file_input.file.seek(0)
        return compute_file_checksum(io.BytesIO(content))
    else:
        return compute_file_checksum(file_input)


def get_r2_key_from_path(file_path: str | None) -> str:
    """
    Chuẩn hóa URL hoặc đường dẫn thành S3/R2 Key (ví dụ: storage/6/abc.docx)
    """
    if not file_path:
        return ""
    key = file_path
    if key.startswith("http://") or key.startswith("https://"):
        if "/storage/" in key:
            key = "storage/" + key.split("/storage/", 1)[1]
        else:
            key = key.split("/", 3)[-1]
    return key.lstrip("/")


def download_file_from_r2(key_or_url: str) -> bytes | None:
    """
    Tải nội dung binary của tệp tin (hỗ trợ đọc local disk hoặc Cloudflare R2).
    """
    key = get_r2_key_from_path(key_or_url)
    # 1. Thử đọc trực tiếp từ ổ đĩa cục bộ
    if key and os.path.exists(key):
        try:
            return Path(key).read_bytes()
        except Exception:
            pass
    if os.path.exists(key_or_url):
        try:
            return Path(key_or_url).read_bytes()
        except Exception:
            pass

    # 2. Thử tải từ R2 nếu có s3_client
    if not key or not s3_client or not settings.BUCKET_NAME:
        return None
    try:
        s3_obj = s3_client.get_object(Bucket=settings.BUCKET_NAME, Key=key)
        return s3_obj["Body"].read()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Lỗi khi tải file từ R2 ({key}): {e}")
        return None


def upload_bytes_to_r2(key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
    """
    Lưu dữ liệu binary (hỗ trợ ghi local disk hoặc đẩy lên Cloudflare R2).
    """
    clean_key = key.lstrip("/")

    # Luôn ghi bản copy local nếu chạy local hoặc không có s3_client
    if getattr(settings, "STORAGE_BACKEND", "local") == "local" or not s3_client:
        local_path = Path(clean_key)
        local_path.parent.mkdir(parents=True, exist_ok=True)
        local_path.write_bytes(data)
        return clean_key

    if s3_client and settings.BUCKET_NAME:
        try:
            s3_client.put_object(
                Bucket=settings.BUCKET_NAME,
                Key=clean_key,
                Body=data,
                ContentType=content_type,
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Lỗi upload R2 ({clean_key}): {e}")
    return clean_key


def download_r2_to_temp_file(key_or_url: str, suffix: str = "") -> Path | None:
    """
    Tải file về file tạm local để các thư viện (pdfplumber, docx, pptx) xử lý.
    Nếu file đã có trên local disk thì trả về trực tiếp.
    """
    clean_key = get_r2_key_from_path(key_or_url)
    if clean_key and os.path.exists(clean_key):
        return Path(clean_key)
    if os.path.exists(key_or_url):
        return Path(key_or_url)

    data = download_file_from_r2(key_or_url)
    if data is None:
        return None
    temp_dir = Path("storage/temp")
    temp_dir.mkdir(parents=True, exist_ok=True)
    if not suffix:
        suffix = Path(clean_key).suffix
    temp_file = temp_dir / f"{uuid.uuid4().hex}{suffix}"
    temp_file.write_bytes(data)
    return temp_file


def get_file_url(file_key: str | None) -> str | None:
    """
    Helper chuẩn hóa file_key thành URL gửi về Frontend.
    - Cloud: URL Cloudflare R2 công khai.
    - Local: URL tương đối /storage/... phục vụ qua StaticFiles.
    """
    if not file_key:
        return None
    if file_key.startswith("http://") or file_key.startswith("https://") or file_key.startswith("data:"):
        return file_key
    clean_key = file_key.lstrip('/')
    if getattr(settings, "STORAGE_BACKEND", "local") != "local" and settings.MINIO_PUBLIC_URL:
        return f"{settings.MINIO_PUBLIC_URL.rstrip('/')}/{clean_key}"
    # return f"/{clean_key}"
    # Nếu chạy local, trả về URL tương đối để frontend có thể truy cập qua StaticFiles và do chuổi JSON trả về đã có /storage/... nên không cần thêm /storage nữa
    return f"{clean_key}"


def safe_remove(path: str | None) -> None:
    """
    Xóa file an toàn: xóa trên Cloudflare R2 (nếu ở cloud) và xóa file local (nếu tồn tại).
    Bỏ qua nếu path là None hoặc '__bundle__'.
    """
    if not path or path == "__bundle__":
        return
    # 1. Xóa trên Cloudflare R2 nếu có client và đang ở chế độ cloud
    key = get_r2_key_from_path(path)
    if s3_client and key and settings.BUCKET_NAME and getattr(settings, "STORAGE_BACKEND", "local") != "local":
        try:
            s3_client.delete_object(Bucket=settings.BUCKET_NAME, Key=key)
        except Exception:
            pass
    # 2. Xóa trên local disk nếu có tồn tại
    try:
        if os.path.exists(path):
            os.remove(path)
    except OSError:
        pass


async def remove_file_if_unreferenced(
    db: AsyncSession, 
    path: str | None, 
    exclude_doc_ids: list[int] | set[int] | None = None
) -> None:
    """Xóa file trên storage chỉ khi không còn bất kỳ Document nào khác tham chiếu tới nó."""
    if not path or path == "__bundle__":
        return
    from sqlalchemy import func, or_, select
    from app.models.document import Document

    query = select(func.count(Document.id)).where(
        or_(
            Document.file_path == path,
            Document.thumbnail_path == path,
            Document.markdown_path == path,
        )
    )
    if exclude_doc_ids:
        query = query.where(Document.id.not_in(exclude_doc_ids))
    count = (await db.execute(query)).scalar() or 0
    if count == 0:
        safe_remove(path)

