# app/core/config.py
from typing import Optional
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
import boto3

# Tính toán đường dẫn gốc của dự án
# config.py -> core (1) -> app (2) -> backend (3) -> Foundation-Project (4)
ROOT_DIR = Path(__file__).resolve().parents[3]
ENV_PATH = ROOT_DIR / ".env"

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str

    # Chế độ lưu trữ: "local" (mặc định cho main/local) hoặc "r2" (cho cloud/produc)
    STORAGE_BACKEND: str = "local"

    # --- Các biến cấu hình Storage Cloudflare R2 / MinIO (tùy chọn) ---
    MINIO_ENDPOINT: Optional[str] = None
    MINIO_ACCESS_KEY: Optional[str] = None
    MINIO_SECRET_KEY: Optional[str] = None
    MINIO_PUBLIC_URL: Optional[str] = None
    BUCKET_NAME: Optional[str] = "elibrary-bucket"

    model_config = SettingsConfigDict(
        env_file=str(ENV_PATH),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

s3_client = None
if settings.MINIO_ENDPOINT and settings.MINIO_ACCESS_KEY and settings.MINIO_SECRET_KEY:
    try:
        s3_client = boto3.client(
            's3',
            endpoint_url=settings.MINIO_ENDPOINT,
            aws_access_key_id=settings.MINIO_ACCESS_KEY,
            aws_secret_access_key=settings.MINIO_SECRET_KEY,
            region_name='auto'  # Chuẩn với Cloudflare R2
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Không thể khởi tạo s3_client: {e}")