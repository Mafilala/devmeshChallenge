import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/stream", tags=["stream"])

# Shared asyncio queue between ingest pipeline and stream consumers.
# ingest.py puts() processed frame bytes here.
# stream consumers get() from here.
frame_queue: asyncio.Queue[bytes] = asyncio.Queue(maxsize=30)

# All active stream WebSocket connections
_viewers: set[WebSocket] = set()


async def _broadcast_loop():
    while True:
        frame_bytes = await frame_queue.get()
        dead = set()
        for ws in _viewers:
            try:
                await ws.send_bytes(frame_bytes)
            except Exception:
                dead.add(ws)
        _viewers.difference_update(dead)


@router.websocket("/ws")
async def stream_ws(websocket: WebSocket):
    await websocket.accept()
    _viewers.add(websocket)
    try:
        # keep connection alive — client doesn't send anything
        while True:
            await asyncio.sleep(30)  # ping-style idle wait
    except WebSocketDisconnect:
        _viewers.discard(websocket)


async def _mjpeg_generator():
    boundary = b"--frame"
    local_queue: asyncio.Queue[bytes] = asyncio.Queue(maxsize=5)

    # register a lightweight subscriber
    class _Sub:
        async def put(self, data):
            if local_queue.full():
                try:
                    local_queue.get_nowait()
                except asyncio.QueueEmpty:
                    pass
            await local_queue.put(data)

    sub = _Sub()
    _viewers.add(sub)  # type: ignore[arg-type]

    try:
        while True:
            frame = await local_queue.get()
            yield boundary + b"\r\nContent-Type: image/jpeg\r\n\r\n" + frame + b"\r\n"
    finally:
        _viewers.discard(sub)  # type: ignore[arg-type]


@router.get("/mjpeg")
async def mjpeg_stream():
    return StreamingResponse(
        _mjpeg_generator(),
        media_type="multipart/x-mixed-replace;boundary=frame",
    )
