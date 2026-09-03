from datetime import UTC, date, datetime
from importlib import import_module

import pytest


def domain():
    try:
        return import_module("app.domain")
    except ModuleNotFoundError:
        pytest.fail("Domain rules have not been implemented")


def test_installments_exact_and_balanced():
    d = domain()
    assert d.split_installments(1001, 3) == [334, 334, 333]
    for total in range(1, 80):
        for count in range(1, total + 1):
            values = d.split_installments(total, count)
            assert sum(values) == total
            assert max(values) - min(values) <= 1
    with pytest.raises(ValueError):
        d.split_installments(2, 3)


def test_cycle_close_inclusive_clamped_and_due_strictly_after():
    d = domain()
    assert d.billing_cycle(date(2026, 2, 28), 31, 5) == (date(2026, 2, 28), date(2026, 3, 5))
    assert d.billing_cycle(date(2026, 3, 1), 28, 28) == (date(2026, 3, 28), date(2026, 4, 28))
    assert d.billing_cycle(date(2026, 1, 29), 28, 5)[0] == date(2026, 2, 28)


def test_habit_today_not_broken_and_historical_schedule():
    d = domain()
    schedules = [
        {"effective_date": "2026-08-31", "kind": "weekdays", "weekdays": [0, 2, 4], "times_per_week": 1}
    ]
    stats = d.habit_stats(
        date(2026, 8, 31), date(2026, 9, 4), schedules, {"2026-08-31": 1, "2026-09-02": 1}, 1, 0
    )
    assert stats["current_streak"] == 2
    assert stats["best_streak"] == 2
    assert stats["total"] == 3
    assert d.local_date(datetime(2026, 9, 4, 1, tzinfo=UTC), "America/Sao_Paulo") == date(2026, 9, 3)


def test_weekly_streak_counts_weeks_and_open_week_does_not_break():
    d = domain()
    schedules = [
        {"effective_date": "2026-08-24", "kind": "times_per_week", "weekdays": [], "times_per_week": 2}
    ]
    stats = d.habit_stats(
        date(2026, 8, 24), date(2026, 9, 3), schedules, {"2026-08-24": 1, "2026-08-26": 1}, 1, 0
    )
    assert stats["current_streak"] == 1
    assert stats["streak_unit"] == "weeks"


def test_snapshot_independent_and_warmup_excluded_from_pr():
    d = domain()
    routine = [
        {
            "exercise_id": "a",
            "name": "Agachamento",
            "muscle_group": "Pernas",
            "sets": 2,
            "reps": 8,
            "load": "50",
            "rest_seconds": 90,
        }
    ]
    snap = d.session_snapshot(routine)
    routine[0]["name"] = "Changed"
    assert snap[0]["name"] == "Agachamento"
    snap[0]["sets"][0].update(load="100", reps=10, type="warmup", completed_at="2026-09-03T10:00:00Z")
    snap[0]["sets"][1].update(load="60", reps=8, completed_at="2026-09-03T10:02:00Z")
    volume, prs = d.workout_metrics(snap, {})
    assert volume == "1480"
    assert prs == 1
    assert not snap[0]["sets"][0]["is_pr"]
    assert snap[0]["sets"][1]["is_pr"]


def test_schedule_change_preserves_daily_history_before_weekly_mode():
    d = domain()
    schedules = [
        {"effective_date": "2026-08-24", "kind": "daily", "weekdays": [], "times_per_week": 1},
        {"effective_date": "2026-08-31", "kind": "times_per_week", "weekdays": [], "times_per_week": 2},
    ]
    stats = d.habit_stats(
        date(2026, 8, 24),
        date(2026, 9, 3),
        schedules,
        {"2026-08-24": 1, "2026-08-25": 1, "2026-08-31": 1, "2026-09-01": 1},
        1,
        0,
    )
    assert stats["total"] == 9
    assert stats["completed"] == 4
    assert stats["current_streak"] == 1
    assert stats["streak_unit"] == "weeks"
