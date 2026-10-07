from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, utcnow


class HostedZone(Base):
    __tablename__ = "hosted_zones"
    __table_args__ = (
        CheckConstraint("type IN ('PUBLIC','PRIVATE')", name="ck_zone_type"),
        Index("ix_zone_name_type_vpc", "name", "type", "vpc_id", unique=True),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    type: Mapped[str] = mapped_column(String(7))
    comment: Mapped[str | None] = mapped_column(String(256), nullable=True)
    vpc_id: Mapped[str] = mapped_column(String(64), default="")  # "" for public zones keeps the unique index effective
    vpc_region: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_by: Mapped[str] = mapped_column(String(64), default="Route 53")
    caller_reference: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    records = relationship("DnsRecord", back_populates="zone", cascade="all, delete-orphan", passive_deletes=True)
