import io
from dataclasses import dataclass

import mediapipe as mp
from PIL import Image, ImageDraw


@dataclass
class ROI:
    x: float
    y: float
    width: float
    height: float
    confidence: float

    def as_dict(self) -> dict:
        return {
            "x": self.x,
            "y": self.y,
            "width": self.width,
            "height": self.height,
            "confidence": self.confidence,
        }


class VideoProcessor:
    _detector = mp.solutions.face_detection.FaceDetection(
        model_selection=0,
        min_detection_confidence=0.5,
    )

    def decode_frame(self, raw: bytes) -> Image.Image:
        return Image.open(io.BytesIO(raw)).convert("RGB")

    def encode_frame(self, image: Image.Image, quality: int = 85) -> bytes:
        buf = io.BytesIO()
        image.save(buf, format="JPEG", quality=quality)
        return buf.getvalue()

    def detect_face(self, image: Image.Image) -> ROI | None:
        import numpy as np

        width, height = image.size
        # mediapipe needs a numpy array in RGB
        np_frame = np.array(image)
        result = self._detector.process(np_frame)

        if not result.detections:
            return None

        # pick the most confident detection
        detection = max(result.detections, key=lambda d: d.score[0])
        bbox = detection.location_data.relative_bounding_box

        # mediapipe returns relative coords (0.0–1.0) → convert to absolute pixels
        x = bbox.xmin * width
        y = bbox.ymin * height
        w = bbox.width * width
        h = bbox.height * height

        # clamp to image bounds (mediapipe can return slightly out-of-bounds values)
        x = max(0.0, x)
        y = max(0.0, y)
        w = min(w, width - x)
        h = min(h, height - y)

        return ROI(x=x, y=y, width=w, height=h, confidence=float(detection.score[0]))

    def draw_roi(self, image: Image.Image, roi: ROI) -> Image.Image:
        annotated = image.copy()
        draw = ImageDraw.Draw(annotated)

        x0, y0 = roi.x, roi.y
        x1, y1 = roi.x + roi.width, roi.y + roi.height

        # outer dark border for contrast on any background
        draw.rectangle([x0 - 1, y0 - 1, x1 + 1, y1 + 1], outline=(0, 0, 0), width=1)
        # main ROI rectangle — bright green
        draw.rectangle([x0, y0, x1, y1], outline=(0, 255, 80), width=2)

        # confidence label
        label = f"{roi.confidence:.0%}"
        draw.text((x0 + 4, y0 + 4), label, fill=(0, 255, 80))

        return annotated

    def process_frame(self, raw_bytes: bytes) -> tuple[bytes, ROI | None]:
        image = self.decode_frame(raw_bytes)
        roi = self.detect_face(image)

        if roi:
            image = self.draw_roi(image, roi)

        return self.encode_frame(image), roi


# singleton
processor = VideoProcessor()
