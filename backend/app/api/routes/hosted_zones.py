import json
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Response, status

from app.api.deps import DbSession, get_current_user
from app.schemas.common import Page
from app.schemas.hosted_zone import HostedZoneCreate, HostedZoneOut, HostedZoneUpdate, ZoneType
from app.services import hosted_zone_service as zones
from app.services import zone_file_service

router = APIRouter(prefix="/hosted-zones", tags=["hosted zones"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=Page[HostedZoneOut])
def list_hosted_zones(
    db: DbSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 10,
    search: Annotated[str | None, Query(max_length=100)] = None,
    type: ZoneType | None = None,
    sort: Literal["name", "created_at"] = "name",
    order: Literal["asc", "desc"] = "asc",
) -> Page[HostedZoneOut]:
    items, total = zones.list_zones(db, page=page, page_size=page_size, search=search, zone_type=type, sort=sort, order=order)
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=HostedZoneOut, status_code=status.HTTP_201_CREATED)
def create_hosted_zone(body: HostedZoneCreate, db: DbSession) -> HostedZoneOut:
    return zones.create_zone(db, body)


@router.get("/{zone_id}", response_model=HostedZoneOut)
def get_hosted_zone(zone_id: str, db: DbSession) -> HostedZoneOut:
    return zones.get_zone(db, zone_id)


@router.patch("/{zone_id}", response_model=HostedZoneOut)
def update_hosted_zone(zone_id: str, body: HostedZoneUpdate, db: DbSession) -> HostedZoneOut:
    return zones.update_zone(db, zone_id, body)


@router.delete("/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_hosted_zone(zone_id: str, db: DbSession, force: bool = False) -> Response:
    zones.delete_zone(db, zone_id, force=force)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{zone_id}/export")
def export_hosted_zone(zone_id: str, db: DbSession, format: Literal["json", "bind"] = "json") -> Response:
    zone, recs = zone_file_service.load_records(db, zone_id)
    filename = zone.name.rstrip(".")
    if format == "bind":
        body, media_type, extension = zone_file_service.export_bind(zone, recs), "text/plain", "zone"
    else:
        body, media_type, extension = json.dumps(zone_file_service.export_json(zone, recs), indent=2), "application/json", "json"
    return Response(body, media_type=media_type, headers={"Content-Disposition": f'attachment; filename="{filename}.{extension}"'})
