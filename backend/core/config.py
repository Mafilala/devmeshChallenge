from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://vuser:vpass@localhost:5432/videodb"
    minio_endpoint: str = "http://localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "video-frames"
    minio_public_endpoint: str = "http://localhost:9000"

    class Config:
        env_file = ".env"


settings = Settings()

