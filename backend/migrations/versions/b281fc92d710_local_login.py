"""Personal credentials and revocable sessions without an external provider."""

import sqlalchemy as sa
from alembic import op

revision = "b281fc92d710"
down_revision = "4b90d2a724f1"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "credentials",
        sa.Column("owner_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("email", sa.String(254), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(300), nullable=False),
        sa.Column("failures", sa.Integer(), nullable=False),
        sa.Column("locked_until", sa.DateTime(timezone=True)),
    )
    op.create_table(
        "personal_sessions",
        sa.Column("digest", sa.String(64), primary_key=True),
        sa.Column("owner_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_personal_sessions_owner_id", "personal_sessions", ["owner_id"])
    op.create_index("ix_personal_sessions_expires_at", "personal_sessions", ["expires_at"])
    op.create_table(
        "login_throttle",
        sa.Column("key", sa.String(30), primary_key=True),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("window_start", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade():
    op.drop_table("login_throttle")
    op.drop_table("personal_sessions")
    op.drop_table("credentials")
