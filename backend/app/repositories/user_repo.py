from sqlalchemy.orm import Session
from app.models.user import User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_email(self, email: str) -> User | None:
        return self.db.query(User).filter(User.email == email).first()

    def get_by_id(self, user_id: str) -> User | None:
        return self.db.query(User).filter(User.id == str(user_id)).first()

    def create(self, full_name: str, email: str, password_hash: str,
               phone: str = None) -> User:
        user = User(
            full_name=full_name,
            email=email,
            password_hash=password_hash,
            phone=phone,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def email_exists(self, email: str) -> bool:
        return self.db.query(User).filter(User.email == email).count() > 0