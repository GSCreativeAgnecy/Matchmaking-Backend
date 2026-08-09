from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import GUID, Base, JSONBType, UTCDateTime, gen_uuid


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[UUID] = mapped_column(GUID, primary_key=True, default=gen_uuid)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    body: Mapped[str | None] = mapped_column(String(2000), nullable=True)

    data: Mapped[dict | None] = mapped_column(JSONBType, nullable=True, default=dict)

    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    read_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=datetime.utcnow, nullable=False, index=True)

    __table_args__ = (Index("ix_notifications_user_read", "user_id", "is_read"),)
