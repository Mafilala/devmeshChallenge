import io

from PIL import Image


class VideoProcessor:
    def decode_frame(self, raw: bytes) -> Image.Image:
        """Decode JPEG/PNG bytes → PIL Image (RGB)."""
        return Image.open(io.BytesIO(raw)).convert("RGB")

    def encode_frame(self, image: Image.Image, quality: int = 85) -> bytes:
        """Encode PIL Image → JPEG bytes."""
        buf = io.BytesIO()
        image.save(buf, format="JPEG", quality=quality)
        return buf.getvalue()


# singleton
processor = VideoProcessor()
