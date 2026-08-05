"""
Streak tracking service.

A "streak day" is counted in Pakistan time (Asia/Karachi, UTC+5), not
server UTC time -- since users are Pakistani students, a student studying
at 11pm PKT should not have their streak wrongly broken just because it's
already past midnight UTC.

Call `update_streak(user, db)` once per qualifying study action (currently:
every explain() call -- see query_service.py). The function is idempotent
per calendar day: calling it multiple times on the same PKT day is a no-op
after the first call, so it's safe to call unconditionally without needing
separate "is this the first action today" tracking elsewhere.
"""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session
from app.models.user import User

PKT = ZoneInfo("Asia/Karachi")


def update_streak(user: User, db: Session) -> None:
    today_pkt = datetime.now(PKT).date()
    last_pkt = user.last_streak_date.astimezone(PKT).date() if user.last_streak_date else None

    if last_pkt == today_pkt:
        # Already counted today -- no-op, avoids double-incrementing on
        # repeated explain() calls within the same day.
        return

    if last_pkt == today_pkt - timedelta(days=1):
        # Studied yesterday (PKT) -- streak continues.
        user.current_streak += 1
    else:
        # Either first-ever activity, or the streak was broken (gap of
        # 2+ days, or last_pkt is None). Restart at 1.
        user.current_streak = 1

    user.longest_streak = max(user.longest_streak, user.current_streak)
    user.last_streak_date = datetime.now(PKT)

    db.commit()