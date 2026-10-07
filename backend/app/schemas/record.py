from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.common import UtcDatetime

RoutingPolicy = Literal["SIMPLE", "WEIGHTED"]


class RecordCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(default="", max_length=255)
    type: str = Field(min_length=1, max_length=8)
    ttl: int | None = None
    values: list[str] = Field(default_factory=list, max_length=100)
    routing_policy: RoutingPolicy = "SIMPLE"
    set_identifier: str | None = Field(default=None, max_length=128)
    weight: int | None = None
    alias_target: str | None = Field(default=None, max_length=255)
    evaluate_target_health: bool = False
    comment: str | None = Field(default=None, max_length=256)


class RecordUpdate(BaseModel):
    """PATCH body: omitted fields keep their current value."""

    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, max_length=255)
    type: str | None = Field(default=None, max_length=8)
    ttl: int | None = None
    values: list[str] | None = Field(default=None, max_length=100)
    routing_policy: RoutingPolicy | None = None
    set_identifier: str | None = Field(default=None, max_length=128)
    weight: int | None = None
    alias_target: str | None = Field(default=None, max_length=255)
    evaluate_target_health: bool | None = None
    comment: str | None = Field(default=None, max_length=256)


class RecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    hosted_zone_id: str
    name: str
    type: str
    ttl: int | None
    values: list[str]
    routing_policy: RoutingPolicy
    set_identifier: str | None
    weight: int | None
    alias_target: str | None
    evaluate_target_health: bool
    comment: str | None
    is_system: bool
    created_at: UtcDatetime
    updated_at: UtcDatetime

    @field_validator("set_identifier", mode="before")
    @classmethod
    def _empty_to_none(cls, v: str | None) -> str | None:
        return v or None


class BatchDeleteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ids: list[int] = Field(min_length=1, max_length=100)


class ImportRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    content: str = Field(min_length=1)


class ImportSkipped(BaseModel):
    line: int
    reason: str


class ImportResultOut(BaseModel):
    created: int
    skipped: list[ImportSkipped]
