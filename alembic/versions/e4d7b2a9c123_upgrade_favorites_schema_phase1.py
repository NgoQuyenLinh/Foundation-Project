"""Upgrade favorites schema phase 1: reading status, notes, check constraint and favorite_tags table

Revision ID: e4d7b2a9c123
Revises: 93f46eb359df
Create Date: 2026-10-02 21:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e4d7b2a9c123'
down_revision: Union[str, Sequence[str], None] = '5cf3f5391595'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Nâng cấp bảng favorites ─────────────────────────────────────────
    # Cập nhật ondelete trên các FK hiện tại (cần drop + recreate)
    op.drop_constraint('favorites_user_id_fkey', 'favorites', type_='foreignkey')
    op.drop_constraint('favorites_document_id_fkey', 'favorites', type_='foreignkey')
    op.create_foreign_key(
        'favorites_user_id_fkey', 'favorites', 'users', ['user_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'favorites_document_id_fkey', 'favorites', 'documents', ['document_id'], ['id'],
        ondelete='CASCADE'
    )

    # Thêm cột reading_status (NOT NULL, server_default 'to_read' để set giá trị cho rows cũ)
    op.add_column(
        'favorites',
        sa.Column('reading_status', sa.String(length=20),
                  server_default='to_read', nullable=False)
    )

    # Thêm cột notes (nullable)
    op.add_column(
        'favorites',
        sa.Column('notes', sa.Text(), nullable=True)
    )

    # Thêm CHECK constraint cho reading_status
    op.create_check_constraint(
        'chk_favorite_reading_status',
        'favorites',
        "reading_status IN ('to_read', 'reading', 'completed')"
    )

    # ── 2. Tạo bảng liên kết favorite_tags ────────────────────────────────
    op.create_table(
        'favorite_tags',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('tag_id', sa.Integer(), nullable=False),
        # FK đến tags.id
        sa.ForeignKeyConstraint(
            ['tag_id'], ['tags.id'],
            name='fk_favorite_tags_tag_id',
            ondelete='CASCADE'
        ),
        # FK composite đến favorites.(user_id, document_id)
        sa.ForeignKeyConstraint(
            ['user_id', 'document_id'],
            ['favorites.user_id', 'favorites.document_id'],
            name='fk_favorite_tags_favorite',
            ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('user_id', 'document_id', 'tag_id',
                                name='pk_favorite_tags')
    )

    # Index riêng cho tag_id (hỗ trợ query "tìm yêu thích theo thẻ")
    op.create_index(
        'ix_favorite_tags_tag_id',
        'favorite_tags',
        ['tag_id']
    )


def downgrade() -> None:
    # Ngược lại với upgrade

    # 1. Xóa index và bảng favorite_tags
    op.drop_index('ix_favorite_tags_tag_id', table_name='favorite_tags')
    op.drop_table('favorite_tags')

    # 2. Xóa CHECK constraint và các cột thêm trong favorites
    op.drop_constraint('chk_favorite_reading_status', 'favorites', type_='check')
    op.drop_column('favorites', 'notes')
    op.drop_column('favorites', 'reading_status')

    # 3. Khôi phục FK về không có ondelete CASCADE
    op.drop_constraint('favorites_user_id_fkey', 'favorites', type_='foreignkey')
    op.drop_constraint('favorites_document_id_fkey', 'favorites', type_='foreignkey')
    op.create_foreign_key(
        'favorites_user_id_fkey', 'favorites', 'users', ['user_id'], ['id']
    )
    op.create_foreign_key(
        'favorites_document_id_fkey', 'favorites', 'documents', ['document_id'], ['id']
    )
