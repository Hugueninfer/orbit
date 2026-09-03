import argparse
from datetime import date

from sqlalchemy import select

from .db import SessionLocal
from .finance import generate_recurrences
from .identity import cleanup_demo
from .models import User


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["extend-recurrences", "cleanup-demo", "telegram-worker"])
    parser.add_argument("--through", type=date.fromisoformat)
    args = parser.parse_args()
    if args.command == "telegram-worker":
        from .integrations import deliver_outbox, process_inbox

        while process_inbox():
            pass
        while deliver_outbox():
            pass
        return
    with SessionLocal.begin() as db:
        if args.command == "cleanup-demo":
            print({"deleted": cleanup_demo(db)})
        else:
            if args.through is None:
                parser.error("--through is required")
            count = 0
            for user in db.scalars(select(User).with_for_update()):
                count += generate_recurrences(db, user, args.through)["created"]
            print({"created": count})


if __name__ == "__main__":
    main()
