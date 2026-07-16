"""
One-off script to promote a user to admin role.
Usage: python scripts/make_admin.py your@email.com
"""
import sys
from app.db.session import SessionLocal
from app.models.user import User


def make_admin(email: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"No user found with email: {email}")
            return
        user.role = "admin"
        db.commit()
        print(f"{email} is now an admin.")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python scripts/make_admin.py your@email.com")
        sys.exit(1)
    make_admin(sys.argv[1])
