"""Persistent random tree variants and private draw bags."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "e105a3ee0010"
down_revision = "d904f0c05123"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("focus_sessions", sa.Column("variant_id", sa.Integer(), nullable=True))
    op.create_check_constraint(
        "ck_focus_variant", "focus_sessions", "variant_id IS NULL OR variant_id BETWEEN 0 AND 9"
    )
    op.create_table(
        "focus_collections",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("owner_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used", JSONB(), nullable=False),
        sa.Column("last_variant", sa.Integer()),
        sa.Column("cycle", sa.Integer(), nullable=False),
        sa.UniqueConstraint("owner_id", name="uq_focus_collection_owner"),
        sa.UniqueConstraint("owner_id", "id", name="uq_focus_collections_owner_id"),
        sa.CheckConstraint("version > 0", name="ck_focus_collections_version"),
        sa.CheckConstraint("cycle > 0", name="ck_focus_collections_0"),
        sa.CheckConstraint(
            "last_variant IS NULL OR last_variant BETWEEN 0 AND 9", name="ck_focus_collections_1"
        ),
        sa.CheckConstraint("jsonb_array_length(used) <= 10", name="ck_focus_collections_2"),
    )
    op.create_index("ix_focus_collections_owner_id", "focus_collections", ["owner_id"])


def downgrade():
    op.drop_table("focus_collections")
    op.drop_constraint("ck_focus_variant", "focus_sessions")
    op.drop_column("focus_sessions", "variant_id")
