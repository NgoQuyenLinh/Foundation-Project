"""
backend/db/add_activity_tracking.py
Migration: mở rộng download_logs + tạo document_stats
Chạy: python -m db.add_activity_tracking  (từ thư mục backend/)
"""
import asyncio

from sqlalchemy import text

from app.core.database import engine


async def main() -> None:
    async with engine.begin() as conn:
        statements = [
            # 1. Mở rộng action column lên VARCHAR(30) để chứa hằng số dài hơn
            "ALTER TABLE download_logs ALTER COLUMN action TYPE VARCHAR(30)",
            # 2. Thêm 3 cột mới vào download_logs
            "ALTER TABLE download_logs ADD COLUMN IF NOT EXISTS workspace_context VARCHAR(20) NOT NULL DEFAULT 'personal'",
            "ALTER TABLE download_logs ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL",
            "ALTER TABLE download_logs ADD COLUMN IF NOT EXISTS extra_data JSONB NOT NULL DEFAULT '{}'",
            # 3. Indexes trên download_logs
            "CREATE INDEX IF NOT EXISTS ix_download_logs_document_id_created_at ON download_logs (document_id, created_at DESC)",
            "CREATE INDEX IF NOT EXISTS ix_download_logs_user_id_created_at ON download_logs (user_id, created_at DESC)",
            "CREATE INDEX IF NOT EXISTS ix_download_logs_action_created_at ON download_logs (action, created_at DESC)",
            # 4. Tạo bảng document_stats
            """
            CREATE TABLE IF NOT EXISTS document_stats (
                document_id    INTEGER PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
                view_count     INTEGER NOT NULL DEFAULT 0,
                download_count INTEGER NOT NULL DEFAULT 0,
                save_count     INTEGER NOT NULL DEFAULT 0,
                share_count    INTEGER NOT NULL DEFAULT 0,
                unique_viewers INTEGER NOT NULL DEFAULT 0,
                trending_score FLOAT   NOT NULL DEFAULT 0.0,
                last_activity_at TIMESTAMP WITH TIME ZONE,
                updated_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
            )
            """,
        ]
        for stmt in statements:
            await conn.execute(text(stmt))

    print("✅ Migration add_activity_tracking hoàn thành.")
    print("   - download_logs.action → VARCHAR(30)")
    print("   - download_logs: thêm workspace_context, workspace_id, extra_data")
    print("   - download_logs: 3 indexes mới")
    print("   - Tạo bảng document_stats")


if __name__ == "__main__":
    asyncio.run(main())
