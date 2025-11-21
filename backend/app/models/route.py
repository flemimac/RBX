from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship

from app.db.base import Base


class Route(Base):
    __tablename__ = "routes"

    id = Column(String(36), primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(String(1000), nullable=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)

    user = relationship("User", back_populates="routes")


