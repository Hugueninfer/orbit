"""Immutable occurrences, full recurrence lifecycle, demo write budget and historical targets."""

import sqlalchemy as sa
from alembic import op

revision = "4b90d2a724f1"
down_revision = "ac469dd784f2"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("demo_write_count", sa.BigInteger(), nullable=False, server_default="0"))
    op.alter_column("users", "demo_write_count", server_default=None)
    op.add_column(
        "recurrences", sa.Column("frequency", sa.String(20), nullable=False, server_default="monthly")
    )
    op.add_column("recurrences", sa.Column("interval", sa.Integer(), nullable=False, server_default="1"))
    op.add_column("recurrences", sa.Column("end_date", sa.Date(), nullable=True))
    op.add_column("recurrences", sa.Column("generated_through", sa.Date(), nullable=True))
    op.add_column("recurrences", sa.Column("schedule_effective_date", sa.Date(), nullable=True))
    op.execute(
        "UPDATE recurrences r SET generated_through = COALESCE((SELECT max(t.date) FROM transactions t WHERE t.recurrence_id = r.id), r.start_date - 1), schedule_effective_date = start_date"
    )
    for field in ["generated_through", "schedule_effective_date"]:
        op.alter_column("recurrences", field, nullable=False)
    op.alter_column("recurrences", "frequency", server_default=None)
    op.alter_column("recurrences", "interval", server_default=None)
    op.create_check_constraint(
        "ck_recurrences_2", "recurrences", "frequency IN ('daily','weekly','monthly','yearly')"
    )
    op.create_check_constraint("ck_recurrences_3", "recurrences", "interval BETWEEN 1 AND 365")
    op.create_check_constraint(
        "ck_recurrences_4", "recurrences", "end_date IS NULL OR end_date >= start_date"
    )
    op.add_column("transactions", sa.Column("scheduled_date", sa.Date(), nullable=True))
    op.add_column(
        "transactions",
        sa.Column("recurrence_superseded", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.alter_column("transactions", "recurrence_superseded", server_default=None)
    # Recover the original date from the earliest audited edit where available.
    # Existing duplicate logical occurrences fail the unique constraint instead of deleting history.
    op.execute(
        "UPDATE transactions t SET scheduled_date = COALESCE((SELECT (a.detail->'before'->>'date')::date FROM audit a WHERE a.entity_type='transaction' AND a.entity_id=t.id::text AND a.detail->'before'->>'date' IS NOT NULL ORDER BY a.created_at LIMIT 1),t.date) WHERE recurrence_id IS NOT NULL"
    )
    op.drop_constraint("transactions_owner_id_recurrence_id_date_key", "transactions", type_="unique")
    op.create_unique_constraint(
        "uq_transaction_occurrence", "transactions", ["owner_id", "recurrence_id", "scheduled_date"]
    )
    op.create_check_constraint(
        "ck_transaction_occurrence_identity",
        "transactions",
        "(recurrence_id IS NULL AND scheduled_date IS NULL) OR (recurrence_id IS NOT NULL AND scheduled_date IS NOT NULL)",
    )
    op.execute("""CREATE FUNCTION protect_occurrence_identity() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF OLD.recurrence_id IS DISTINCT FROM NEW.recurrence_id OR OLD.scheduled_date IS DISTINCT FROM NEW.scheduled_date THEN
        RAISE EXCEPTION 'recurrence occurrence identity is immutable' USING ERRCODE='23514';
      END IF;
      RETURN NEW;
    END $$;
    CREATE TRIGGER transaction_occurrence_identity BEFORE UPDATE OF recurrence_id, scheduled_date ON transactions FOR EACH ROW EXECUTE FUNCTION protect_occurrence_identity();""")
    op.execute(
        "UPDATE habits SET schedules = (SELECT jsonb_agg(rule || jsonb_build_object('target_quantity', COALESCE((rule->>'target_quantity')::int, habits.target_quantity)) ORDER BY rule->>'effective_date') FROM jsonb_array_elements(habits.schedules) rule)"
    )
    tables = [
        "task_lists",
        "tasks",
        "habits",
        "habit_checkins",
        "accounts",
        "categories",
        "transfers",
        "recurrences",
        "cards",
        "invoices",
        "purchases",
        "installments",
        "invoice_payments",
        "transactions",
        "exercises",
        "routines",
        "workout_sessions",
        "telegram_links",
        "audit",
        "idempotency",
        "demo_tokens",
        "integration_inbox",
    ]
    counts = " + ".join(f"(SELECT count(*) FROM {table} x WHERE x.owner_id = u.id)" for table in tables)
    op.execute(
        f"UPDATE users u SET demo_write_count = 1 + {counts} + (SELECT count(*) FROM integration_outbox o JOIN integration_inbox i ON i.id=o.inbox_id WHERE i.owner_id=u.id) WHERE u.expires_at IS NOT NULL"
    )


def downgrade():
    op.execute(
        "UPDATE habits SET schedules = (SELECT jsonb_agg(rule - 'target_quantity' ORDER BY rule->>'effective_date') FROM jsonb_array_elements(habits.schedules) rule)"
    )
    op.execute(
        "DROP TRIGGER transaction_occurrence_identity ON transactions; DROP FUNCTION protect_occurrence_identity()"
    )
    op.drop_constraint("ck_transaction_occurrence_identity", "transactions", type_="check")
    op.drop_constraint("uq_transaction_occurrence", "transactions", type_="unique")
    # Downgrade may reject user-rescheduled date collisions; it never deletes obligations.
    op.create_unique_constraint(
        "transactions_owner_id_recurrence_id_date_key", "transactions", ["owner_id", "recurrence_id", "date"]
    )
    op.drop_column("transactions", "scheduled_date")
    op.drop_column("transactions", "recurrence_superseded")
    for name in ["ck_recurrences_2", "ck_recurrences_3", "ck_recurrences_4"]:
        op.drop_constraint(name, "recurrences", type_="check")
    for field in ["frequency", "interval", "end_date", "generated_through", "schedule_effective_date"]:
        op.drop_column("recurrences", field)
    op.drop_column("users", "demo_write_count")
