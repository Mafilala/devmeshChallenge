import asyncio
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from core.processor import processor
from db.database import AsyncSessionLocal
from models.frames import Frame, Session
from storage.services import minio

from .stream import frame_queue  # shared queue between ingest → stream

router = APIRouter(prefix="/ingest", tags=["ingest"])


async def _save_frame(
    session_id: str,
    frame_number: int,
    processed_bytes: bytes,
    roi,
) -> Frame:
    key = f"frames/{session_id}/{frame_number:06d}.jpg"
    minio.upload_bytes(key, processed_bytes, content_type="image/jpeg")

    frame = Frame(
        session_id=session_id,
        frame_number=frame_number,
        storage_key=key,
        captured_at=datetime.now(timezone.utc),
        roi_x=roi.x if roi else None,
        roi_y=roi.y if roi else None,
        roi_width=roi.width if roi else None,
        roi_height=roi.height if roi else None,
        confidence=roi.confidence if roi else None,
    )

    async with AsyncSessionLocal() as db:
        db.add(frame)
        await db.commit()

    return frame


@router.websocket("/ws")
async def ingest_ws(websocket: WebSocket):
    await websocket.accept()

    session_id = str(uuid.uuid4())
    frame_number = 0

    # create session record
    async with AsyncSessionLocal() as db:
        db.add(Session(id=session_id, started_at=datetime.now(timezone.utc)))
        await db.commit()

    try:
        while True:
            # receive raw frame bytes from client
            raw_bytes = await websocket.receive_bytes()
            frame_number += 1

            # run the pipeline (CPU-bound — offload to thread pool)
            loop = asyncio.get_event_loop()
            processed_bytes, roi = await loop.run_in_executor(
                None, processor.process_frame, raw_bytes
            )

            # store asynchronously (don't block the next frame)
            asyncio.create_task(
                _save_frame(session_id, frame_number, processed_bytes, roi)
            )

            # push processed frame to all /stream WebSocket consumers
            await frame_queue.put(processed_bytes)

            # send ROI data back to the sender
            roi_payload = roi.as_dict() if roi else None
            await websocket.send_json(
                {
                    "session_id": session_id,
                    "frame_number": frame_number,
                    "roi": roi_payload,
                }
            )

    except WebSocketDisconnect:
        # mark session as ended
        async with AsyncSessionLocal() as db:
            session = await db.get(Session, session_id)
            if session:
                session.ended_at = datetime.now(timezone.utc)
                await db.commit()
