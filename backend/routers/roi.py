from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from models.frames import Frame, Session
from storage.services import minio

router = APIRouter(prefix="/roi-data", tags=["roi-data"])


# ── Response schemas ───────────────────────────────────────────
class ROISchema(BaseModel):
    x: float
    y: float
    width: float
    height: float
    confidence: float


class FrameResponse(BaseModel):
    id: int
    session_id: str
    frame_number: int
    captured_at: datetime
    has_face: bool
    roi: ROISchema | None
    frame_url: str | None  # public MinIO URL

    class Config:
        from_attributes = True


class SessionResponse(BaseModel):
    id: str
    started_at: datetime
    ended_at: datetime | None
    frame_count: int


# ── Helpers ────────────────────────────────────────────────────
def _frame_to_response(frame: Frame) -> FrameResponse:
    roi = None
    if frame.has_face:
        roi = ROISchema(
            x=frame.roi_x,
            y=frame.roi_y,
            width=frame.roi_width,
            height=frame.roi_height,
            confidence=frame.confidence,
        )
    url = minio.public_url(frame.storage_key) if frame.storage_key else None
    return FrameResponse(
        id=frame.id,
        session_id=frame.session_id,
        frame_number=frame.frame_number,
        captured_at=frame.captured_at,
        has_face=frame.has_face,
        roi=roi,
        frame_url=url,
    )


# ── Endpoints ──────────────────────────────────────────────────
@router.get("/latest", response_model=FrameResponse)
async def get_latest(db: AsyncSession = Depends(get_db)):
    """Return the most recent frame that had a detected face."""
    result = await db.execute(
        select(Frame).where(Frame.roi_x.isnot(None)).order_by(desc(Frame.id)).limit(1)
    )
    frame = result.scalar_one_or_none()
    if not frame:
        raise HTTPException(status_code=404, detail="No frames with detected face yet")
    return _frame_to_response(frame)


@router.get("/session/{session_id}", response_model=list[FrameResponse])
async def get_session_frames(
    session_id: str,
    face_only: bool = Query(False, description="Return only frames with detected face"),
    limit: int = Query(100, le=1000),
    db: AsyncSession = Depends(get_db),
):
    """Return frames for a given session."""
    query = (
        select(Frame).where(Frame.session_id == session_id).order_by(Frame.frame_number)
    )
    if face_only:
        query = query.where(Frame.roi_x.isnot(None))
    query = query.limit(limit)

    result = await db.execute(query)
    frames = result.scalars().all()
    return [_frame_to_response(f) for f in frames]


@router.get("/sessions", response_model=list[SessionResponse])
async def list_sessions(db: AsyncSession = Depends(get_db)):
    """List all streaming sessions."""
    result = await db.execute(select(Session).order_by(desc(Session.started_at)))
    sessions = result.scalars().all()

    out = []
    for s in sessions:
        count_result = await db.execute(select(Frame).where(Frame.session_id == s.id))
        count = len(count_result.scalars().all())
        out.append(
            SessionResponse(
                id=s.id,
                started_at=s.started_at,
                ended_at=s.ended_at,
                frame_count=count,
            )
        )
    return out
