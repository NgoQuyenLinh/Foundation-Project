import asyncio

from sqlalchemy import text

from app.core.database import engine
from app.models.base import Base

# Import models so SQLAlchemy metadata knows every table.
from app.models import (  # noqa: F401
    academic_class,
    category,
    document,
    document_share,
    document_tag,
    document_version,
    download_log,
    faculty,
    favorite,
    folder,
    folder_tag,
    note,
    notification,
    processing_job,
    tag,
    trash_batch,
    user,
    workspace,
    workspace_invitation,
    workspace_member,
)


async def main() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        statements = [
            # workspaces
            "ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS is_dissolving BOOLEAN DEFAULT false",
            "ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS dissolve_at TIMESTAMP WITH TIME ZONE",
            # workspace_invitations
            "ALTER TABLE workspace_invitations ADD COLUMN IF NOT EXISTS message VARCHAR(500)",
            # folders
            "ALTER TABLE folders ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE",
            "CREATE INDEX IF NOT EXISTS ix_folders_workspace_id ON folders(workspace_id)",
            # documents — tất cả cột được thêm sau này
            "ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_orphaned BOOLEAN DEFAULT false",
            "ALTER TABLE documents ADD COLUMN IF NOT EXISTS orphaned_at TIMESTAMP WITH TIME ZONE",
            "ALTER TABLE documents ADD COLUMN IF NOT EXISTS trash_source VARCHAR(30)",
            "ALTER TABLE documents ADD COLUMN IF NOT EXISTS trash_group_name VARCHAR(150)",
            "ALTER TABLE documents ADD COLUMN IF NOT EXISTS trash_batch_id INTEGER REFERENCES trash_batches(id)",
            "ALTER TABLE documents ADD COLUMN IF NOT EXISTS markdown_path VARCHAR(1024)",
            "ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_bundle BOOLEAN NOT NULL DEFAULT false",
            "ALTER TABLE documents ADD COLUMN IF NOT EXISTS bundle_parent_id INTEGER REFERENCES documents(id) ON DELETE CASCADE",
            "CREATE INDEX IF NOT EXISTS ix_documents_bundle_parent_id ON documents(bundle_parent_id)",
            "ALTER TABLE documents ADD COLUMN IF NOT EXISTS subject_id INTEGER REFERENCES subjects(id)",
            "ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_document_id INTEGER REFERENCES documents(id)",
            "ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false",
        ]
        for statement in statements:
            try:
                await conn.execute(text(statement))
                print(f"  ✅ {statement[:80]}...")
            except Exception as e:
                print(f"  ⚠️  Bỏ qua (có thể đã tồn tại): {e}")

    print("\n✅ Sync schema hoàn tất!")


if __name__ == "__main__":
    asyncio.run(main())
