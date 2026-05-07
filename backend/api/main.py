import asyncio
from contextlib import asynccontextmanager

from db.database import init_db
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import ingest, roi, stream


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── startup ──────────────────────────────────────────────
    await init_db()

    # start the background broadcast loop
    broadcast_task = asyncio.create_task(stream._broadcast_loop())

    yield

    # ── shutdown ─────────────────────────────────────────────
    broadcast_task.cancel()


app = FastAPI(
    title="DevMesh Challenge: Face Detection API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Mount routers ────────────────────────────────────────────
app.include_router(ingest.router)
app.include_router(stream.router)
app.include_router(roi.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
