import asyncio
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# ==================== THÊM ĐƯỜNG DẪN ====================
sys.path.append(str(Path(__file__).resolve().parents[1] / "backend"))

# ==================== IMPORT ====================
from app.core.config import settings

# Import Base từ đúng nơi model đang dùng
import app.models
from app.models.base import Base

# Import tất cả model để Alembic nhận diện metadata
from app.models import (
    User,
    Category,
    Tag,
    Document,
    DocumentTag,
    DocumentVersion,
    Note,
    Favorite,
    favorite_tags,
    DownloadLog,
    ProcessingJob,
)

# this is the Alembic Config object
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Lấy URL từ settings
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    db_url = config.get_main_option("sqlalchemy.url", "")
    # Chỉ bật SSL khi kết nối với Neon hoặc remote host (không phải localhost)
    use_ssl = "localhost" not in db_url and "127.0.0.1" not in db_url
    connect_args = {"ssl": True} if use_ssl else {}

    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args=connect_args,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()