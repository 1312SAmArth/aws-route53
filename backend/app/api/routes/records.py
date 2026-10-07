from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status

from app.api.deps import DbSession, get_current_user
from app.schemas.common import Page
from app.schemas.record import BatchDeleteRequest, ImportRequest, ImportResultOut, RecordCreate, RecordOut, RecordUpdate, RoutingPolicy
from app.services import record_service as records
from app.services import zone_file_service

router = APIRouter(tags=["records"], dependencies=[Depends(get_current_user)])


@router.get("/hosted-zones/{zone_id}/records", response_model=Page[RecordOut])
def list_records(
    zone_id: str,
    db: DbSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 10,
    search: Annotated[str | None, Query(max_length=100)] = None,
    type: Annotated[str | None, Query(max_length=8)] = None,
    routing_policy: RoutingPolicy | None = None,
    alias: bool | None = None,
) -> Page[RecordOut]:
    items, total = records.list_records(
        db, zone_id, page=page, page_size=page_size, search=search, record_type=type, routing_policy=routing_policy, alias=alias
    )
    return Page(items=[RecordOut.model_validate(r) for r in items], total=total, page=page, page_size=page_size)


@router.post("/hosted-zones/{zone_id}/records", response_model=RecordOut, status_code=status.HTTP_201_CREATED)
def create_record(zone_id: str, body: RecordCreate, db: DbSession) -> RecordOut:
    return RecordOut.model_validate(records.create_record(db, zone_id, body))


@router.post("/hosted-zones/{zone_id}/records/batch-delete")
def batch_delete_records(zone_id: str, body: BatchDeleteRequest, db: DbSession) -> dict[str, int]:
    return {"deleted": records.batch_delete(db, zone_id, body.ids)}


@router.post("/hosted-zones/{zone_id}/records/import", response_model=ImportResultOut)
def import_records(zone_id: str, body: ImportRequest, db: DbSession) -> ImportResultOut:
    result = zone_file_service.import_bind(db, zone_id, body.content)
    return ImportResultOut(created=result.created, skipped=result.skipped)


@router.get("/records/{record_id}", response_model=RecordOut)
def get_record(record_id: int, db: DbSession) -> RecordOut:
    return RecordOut.model_validate(records.get_record(db, record_id))


@router.patch("/records/{record_id}", response_model=RecordOut)
def update_record(record_id: int, body: RecordUpdate, db: DbSession) -> RecordOut:
    return RecordOut.model_validate(records.update_record(db, record_id, body))


@router.delete("/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_record(record_id: int, db: DbSession) -> Response:
    records.delete_record(db, record_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
