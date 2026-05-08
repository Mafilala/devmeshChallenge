# Devmesh Challenge: Real-time Face Detection Pipeline

A containerized backend API that accepts a live video feed, detects faces in each frame, draws a bounding box (ROI) around the face using Pillow, stores frame metadata in PostgreSQL, stores processed frames in MinIO, and streams the result to a Next.js frontend in real time.

---

## What it does

1. Browser captures webcam frames and sends them to the backend over WebSocket
2. Backend detects the face in each frame using mediapipe
3. Backend draws a green bounding box around the face using Pillow (no OpenCV)
4. Processed frame is stored in MinIO, ROI coordinates are stored in PostgreSQL
5. Processed frame is broadcast to all connected viewers over WebSocket
6. Frontend displays the live feed and ROI data in real time

---

## Project structure

```
.
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── api/
│   │   └── main.py              # FastAPI app, lifespan, routers, CORS
│   ├── core/
│   │   ├── config.py            # all environment variables via pydantic-settings
│   │   └── processor.py         # face detection + ROI drawing pipeline
│   ├── db/
│   │   └── database.py          # SQLAlchemy async engine, session, init_db
│   ├── models/
│   │   └── frames.py            # Session and Frame ORM models
│   ├── routers/
│   │   ├── ingest.py            # WS /ingest/ws — receives raw frames
│   │   ├── stream.py            # WS /stream/ws — broadcasts processed frames
│   │   └── roi.py               # GET /roi-data — serves ROI from PostgreSQL
│   └── storage/
│       └── services.py          # MinIO client wrapper (boto3)
└── frontend/                    # Next.js app (facenet-next)
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   └── page.tsx         # main page, wires all components
        ├── hooks/
        │   ├── useStream.ts     # WebSocket lifecycle, state, FPS counter
        │   └── useClock.ts      # ticking clock
        ├── types/
        │   └── index.ts         # shared TypeScript types
        └── components/
            ├── ui/              # Button, StatusDot, SectionLabel
            ├── layout/          # Header, Sidebar
            ├── feed/            # VideoFeed
            ├── roi/             # ROIPanel
            ├── stats/           # StatsGrid
            └── log/             # EventLog
```

---

## Prerequisites

- Docker Desktop installed and running
- Port `8000`, `3000`, `9000`, `9001` free on your machine
- Webcam accessible by your browser

> **Note:** If you have a local PostgreSQL instance running, it likely occupies port `5432`.
> The compose file maps postgres to `5433` on the host to avoid the conflict.

---

## Running the project

**1. Clone the repo**

```bash
git clone git@github.com:Mafilala/devmeshChallenge.git
cd devmeshChallenge 
```

**2. Start all containers**

```bash
docker compose up --build
```

This starts four containers:

| Container | What it does | Port |
|---|---|---|
| `minio` | Object storage for processed frames | `9000` (API), `9001` (Console) |
| `postgres` | Stores session and ROI metadata | `5433` (host) |
| `backend` | FastAPI — ingest, stream, roi endpoints | `8000` |
| `frontend` | Next.js — the browser UI | `3000` |

**3. Open the frontend**

```
http://localhost:3000
```

Click **START**, allow camera access, and you will see the live feed with a green bounding box drawn around your face.

---

## API endpoints

### `WS /ingest/ws`
Receives raw JPEG frames from the browser.

- Client sends: raw JPEG bytes
- Server responds with JSON per frame:
```json
{
  "session_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "frame_number": 42,
  "roi": {
    "x": 120.0,
    "y": 45.0,
    "width": 80.0,
    "height": 90.0,
    "confidence": 0.97
  }
}
```
- `roi` is `null` if no face was detected in that frame

---

### `WS /stream/ws`
Pushes processed JPEG frames (with ROI drawn) to all connected viewers.

- Server sends: raw JPEG bytes (binary WebSocket frame)
- Client receives and displays in an `<img>` tag

---

### `GET /roi-data/latest`
Returns the most recent frame where a face was detected.

```json
{
  "id": 1042,
  "session_id": "f47ac10b-...",
  "frame_number": 42,
  "captured_at": "2026-05-04T15:06:31Z",
  "has_face": true,
  "roi": { "x": 120.0, "y": 45.0, "width": 80.0, "height": 90.0, "confidence": 0.97 },
  "frame_url": "http://localhost:9000/video-frames/frames/f47ac10b-.../000042.jpg"
}
```

---

### `GET /roi-data/session/{session_id}`
Returns all frames for a session. Optional query params:
- `?face_only=true` — only frames where a face was detected
- `?limit=100` — max results (default 100, max 1000)

---

### `GET /roi-data/sessions`
Lists all streaming sessions with frame counts.

---

### `GET /health`
Returns `{"status": "ok"}`. Used by Docker healthchecks.

---

## Database schema

### `sessions`
| Column | Type | Description |
|---|---|---|
| `id` | string (UUID) | Generated by the backend, not the database |
| `started_at` | timestamp | When the WebSocket connection was accepted |
| `ended_at` | timestamp (nullable) | When the client disconnected |

### `frames`
| Column | Type | Description |
|---|---|---|
| `id` | integer (autoincrement) | Primary key |
| `session_id` | string (FK) | Links to `sessions.id` |
| `frame_number` | integer | Sequential counter within the session |
| `captured_at` | timestamp | When the frame was processed |
| `storage_key` | string (nullable) | Path inside MinIO e.g. `frames/{session_id}/{frame_number}.jpg` |
| `roi_x` | float (nullable) | Bounding box left edge in pixels |
| `roi_y` | float (nullable) | Bounding box top edge in pixels |
| `roi_width` | float (nullable) | Bounding box width in pixels |
| `roi_height` | float (nullable) | Bounding box height in pixels |
| `confidence` | float (nullable) | Detection confidence 0.0–1.0 |

All ROI columns are `null` when no face was detected in that frame.

---

## Frame pipeline

Each frame follows this path through the backend:

```
Browser (webcam)
    │  JPEG bytes over WebSocket
    ▼
/ingest/ws
    │
    ├─── run_in_executor (thread pool)
    │         │
    │         ▼
    │    processor.process_frame()
    │         │  mediapipe detects face
    │         │  Pillow draws green rectangle
    │         │  returns (jpeg_bytes, ROI)
    │         │
    │    ◄────┘
    │
    ├─── create_task → MinIO (store JPEG)
    │                → PostgreSQL (store ROI coords)
    │
    ├─── frame_queue.put() → _broadcast_loop → all /stream/ws viewers
    │
    └─── send_json(roi) → back to the browser that sent the frame
```

`run_in_executor` is used for `process_frame` because mediapipe is CPU-bound. Running it directly on the event loop would block all other requests for the duration of each frame's processing.

`create_task` is used for storage because it is async I/O — it can run in the background without holding up the next frame.

---

## MinIO

Processed frames are stored at:
```
{bucket}/{session_id}/{frame_number:06d}.jpg

example:
video-frames/f47ac10b-58cc-4372-a567-0e02b2c3d479/000042.jpg
```

PostgreSQL stores the key string. MinIO stores the actual bytes. To browse stored frames, open the MinIO console:

```
http://localhost:9001
username: minioadmin
password: minioadmin
```

---

## Environment variables

All backend config is read from environment variables with defaults for local development:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://vuser:vpass@postgres:5432/videodb` | PostgreSQL connection string |
| `MINIO_ENDPOINT` | `http://minio:9000` | MinIO internal URL (Docker network) |
| `MINIO_ACCESS_KEY` | `minioadmin` | MinIO access key |
| `MINIO_SECRET_KEY` | `minioadmin` | MinIO secret key |
| `MINIO_BUCKET` | `video-frames` | Bucket name |
| `MINIO_PUBLIC_ENDPOINT` | `http://localhost:9000` | Browser-accessible MinIO URL |

For the frontend:

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_BACKEND_WS` | `ws://localhost:8000` | Backend WebSocket base URL |

---

## Stopping and resetting

**Stop all containers:**
```bash
docker compose down
```

**Stop and delete all stored data (frames, database):**
```bash
docker compose down -v
```

The `-v` flag removes the Docker volumes — `postgres_data`, `minio_data`. Next `docker compose up` starts completely fresh.

---

## Known limitations

- Assumes one face per frame — if multiple faces are present, the highest-confidence detection is used
- No authentication on any endpoint — not suitable for public deployment as-is
- `frame_queue` is in-memory — if the backend restarts, queued frames are lost
- Multiple backend workers (e.g. `--workers 4`) would require Redis to share `frame_queue` across processes
