"""add_activity_tracking

Revision ID: d76927b437fe
Revises: 45ab664fbe54
Create Date: 2026-10-24 16:00:32.673235

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd76927b437fe'
down_revision: Union[str, Sequence[str], None] = '45ab664fbe54'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: extend download_logs + create document_stats."""
    op.execute("ALTER TABLE download_logs ALTER COLUMN action TYPE VARCHAR(30)")
    op.execute(
        "ALTER TABLE download_logs "
        "ADD COLUMN IF NOT EXISTS workspace_context VARCHAR(20) NOT NULL DEFAULT 'personal'"
    )
    op.execute(
        "ALTER TABLE download_logs "
        "ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL"
    )
    op.execute(
        "ALTER TABLE download_logs "
        "ADD COLUMN IF NOT EXISTS extra_data JSONB NOT NULL DEFAULT '{}'"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_download_logs_document_id_created_at "
        "ON download_logs (document_id, created_at DESC)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_download_logs_user_id_created_at "
        "ON download_logs (user_id, created_at DESC)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_download_logs_action_created_at "
        "ON download_logs (action, created_at DESC)"
    )
    op.execute(
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
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP TABLE IF EXISTS document_stats")
    op.execute("DROP INDEX IF EXISTS ix_download_logs_action_created_at")
    op.execute("DROP INDEX IF EXISTS ix_download_logs_user_id_created_at")
    op.execute("DROP INDEX IF EXISTS ix_download_logs_document_id_created_at")
    op.execute("ALTER TABLE download_logs DROP COLUMN IF EXISTS extra_data")
    op.execute("ALTER TABLE download_logs DROP COLUMN IF EXISTS workspace_id")
    op.execute("ALTER TABLE download_logs DROP COLUMN IF EXISTS workspace_context")
