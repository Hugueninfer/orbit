"""Persistent focus garden, one active session per owner."""

from alembic import op
import sqlalchemy as sa

revision = "d904f0c05123"
down_revision = "c713a0f92d81"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "focus_sessions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("owner_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("session_kind", sa.String(10), nullable=False),
        sa.Column("species", sa.String(10), nullable=False),
        sa.Column("label", sa.String(120), nullable=False),
        sa.Column("duration_seconds", sa.Integer(), nullable=False),
        sa.Column("remaining_seconds", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(12), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deadline_at", sa.DateTime(timezone=True)),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("owner_id", "id", name="uq_focus_sessions_owner_id"),
        sa.CheckConstraint("version > 0", name="ck_focus_sessions_version"),
        *[
            sa.CheckConstraint(check, name=f"ck_focus_sessions_{i}")
            for i, check in enumerate(
                [
                    "duration_seconds BETWEEN 60 AND 10800",
                    "remaining_seconds BETWEEN 0 AND duration_seconds",
                    "status IN ('running', 'paused', 'completed', 'cancelled')",
                    "session_kind IN ('focus', 'break')",
                    "species IN ('oak', 'pine', 'sakura')",
                    "(status = 'running') = (deadline_at IS NOT NULL)",
                    "(status IN ('completed', 'cancelled')) = (finished_at IS NOT NULL)",
                ]
            )
        ],
    )
    op.create_index("ix_focus_sessions_owner_id", "focus_sessions", ["owner_id"])
    op.create_index("ix_focus_owner_finished", "focus_sessions", ["owner_id", "finished_at"])
    op.create_index(
        "uq_focus_active_owner",
        "focus_sessions",
        ["owner_id"],
        unique=True,
        postgresql_where=sa.text("status IN ('running', 'paused')"),
    )


def downgrade():
    op.drop_table("focus_sessions")
