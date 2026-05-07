from datetime import datetime, timezone

from db.database import Base
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    ended_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    frames: Mapped[list["Frame"]] = relationship("Frame", back_populates="session")


class Frame(Base):
    __tablename__ = "frames"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), index=True)
    frame_number: Mapped[int] = mapped_column(Integer)
    captured_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # MinIO key — e.g. "frames/session_abc/00001.jpg"
    storage_key: Mapped[str | None] = mapped_column(String, nullable=True)

    # ROI bounding box — null if no face detected in this frame
    roi_x: Mapped[float | None] = mapped_column(Float, nullable=True)
    roi_y: Mapped[float | None] = mapped_column(Float, nullable=True)
    roi_width: Mapped[float | None] = mapped_column(Float, nullable=True)
    roi_height: Mapped[float | None] = mapped_column(Float, nullable=True)

    # detection confidence score
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    session: Mapped["Session"] = relationship("Session", back_populates="frames")

    @property
    def has_face(self) -> bool:
        return self.roi_x is not None
