import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, String

from app.db.base import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(
        String(36),
        primary_key=True,
        default=generate_uuid,
    )
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<User email={self.email}>"


