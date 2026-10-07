from datetime import datetime

from sqlalchemy import JSON, Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, utcnow

RECORD_TYPES = ("A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA", "SOA")


class DnsRecord(Base):
    __tablename__ = "records"
    __table_args__ = (
        CheckConstraint("type IN ('A','AAAA','CNAME','TXT','MX','NS','PTR','SRV','CAA','SOA')", name="ck_record_type"),
        CheckConstraint("routing_policy IN ('SIMPLE','WEIGHTED')", name="ck_record_policy"),
        UniqueConstraint("hosted_zone_id", "name", "type", "set_identifier", name="uq_record_identity"),
        Index("ix_records_zone_name", "hosted_zone_id", "name"),
        Index("ix_records_zone_type", "hosted_zone_id", "type"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    hosted_zone_id: Mapped[str] = mapped_column(ForeignKey("hosted_zones.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    type: Mapped[str] = mapped_column(String(8))
    ttl: Mapped[int | None] = mapped_column(Integer, nullable=True)
    values: Mapped[list[str]] = mapped_column(JSON, default=list)
    routing_policy: Mapped[str] = mapped_column(String(8), default="SIMPLE")
    set_identifier: Mapped[str] = mapped_column(String(128), default="")  # "" (not NULL) so the unique constraint applies
    weight: Mapped[int | None] = mapped_column(Integer, nullable=True)
    alias_target: Mapped[str | None] = mapped_column(String(255), nullable=True)
    evaluate_target_health: Mapped[bool] = mapped_column(Boolean, default=False)
    comment: Mapped[str | None] = mapped_column(String(256), nullable=True)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    zone = relationship("HostedZone", back_populates="records")
