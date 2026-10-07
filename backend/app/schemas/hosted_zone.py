from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import UtcDatetime

ZoneType = Literal["PUBLIC", "PRIVATE"]


class HostedZoneCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=255)
    type: ZoneType = "PUBLIC"
    comment: str | None = Field(default=None, max_length=256)
    vpc_id: str | None = Field(default=None, max_length=64)
    vpc_region: str | None = Field(default=None, max_length=32)


class HostedZoneUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    comment: str | None = Field(default=None, max_length=256)


class HostedZoneOut(BaseModel):
    id: str
    name: str
    type: ZoneType
    comment: str | None
    vpc_id: str | None
    vpc_region: str | None
    created_by: str
    record_count: int
    name_servers: list[str]
    created_at: UtcDatetime
    updated_at: UtcDatetime
