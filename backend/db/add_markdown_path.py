"""
backend/db/add_markdown_path.py
Migration: thêm cột markdown_path vào bảng documents
Chạy: python -m db.add_markdown_path  (từ thư mục backend/)
"""
import asyncio
from sqlalchemy import text
from app.core.database import engine


async def main() -> None:
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "ALTER TABLE documents "
                "ADD COLUMN IF NOT EXISTS markdown_path VARCHAR(1024)"
            )
        )
    print("✅ Cột markdown_path đã được thêm vào bảng documents.")


if __name__ == "__main__":
    asyncio.run(main())
