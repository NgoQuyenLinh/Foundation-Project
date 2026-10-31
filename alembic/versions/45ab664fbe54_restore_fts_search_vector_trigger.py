"""restore_fts_search_vector_trigger

Revision ID: 45ab664fbe54
Revises: 93f46eb359df
Create Date: 2026-10-10 19:40:04.804395

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '45ab664fbe54'
down_revision: Union[str, Sequence[str], None] = '93f46eb359df'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("""
        CREATE OR REPLACE FUNCTION update_document_search_vector()
        RETURNS trigger AS $$
        BEGIN
            NEW.search_vector :=
                setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
                setweight(to_tsvector('simple', coalesce(NEW.content, '')), 'B');
            RETURN NEW;
        END
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trg_documents_search_vector ON documents;

        CREATE TRIGGER trg_documents_search_vector
        BEFORE INSERT OR UPDATE OF title, content
        ON documents
        FOR EACH ROW
        EXECUTE FUNCTION update_document_search_vector();
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("""
        DROP TRIGGER IF EXISTS trg_documents_search_vector ON documents;
        DROP FUNCTION IF EXISTS update_document_search_vector();
    """)
