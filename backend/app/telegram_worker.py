"""Embedded worker for small Docker installs; the PostgreSQL queue survives restarts."""

import asyncio
import logging
import threading
from contextlib import asynccontextmanager

from .integrations import deliver_outbox, process_inbox

logger = logging.getLogger(__name__)


def run(stop: threading.Event):
    while not stop.is_set():
        try:
            processed = process_inbox()
            delivered = deliver_outbox()
            # Failed deliveries keep a persisted retry schedule in the outbox.
            stop.wait(1 if processed or delivered else 5)
        except Exception as exc:
            # HTTP exceptions can embed tokens in Telegram URLs: never log their text.
            logger.warning("telegram_worker_retry error_type=%s", type(exc).__name__)
            stop.wait(15)


@asynccontextmanager
async def worker_lifespan(enabled: bool):
    stop = threading.Event()
    thread = (
        threading.Thread(target=run, args=(stop,), name="telegram-worker", daemon=True) if enabled else None
    )
    if thread:
        thread.start()
    try:
        yield
    finally:
        stop.set()
        if thread:
            await asyncio.to_thread(thread.join, 10)
