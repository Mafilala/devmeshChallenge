import io

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
from core.config import settings


class SSClient:
    def __init__(self):
        self.bucket = settings.minio_bucket
        self.public_endpoint = settings.minio_public_endpoint

        self.client = boto3.client(
            "s3",
            endpoint_url=settings.minio_endpoint,
            aws_access_key_id=settings.minio_access_key,
            aws_secret_access_key=settings.minio_secret_key,
            config=Config(signature_version="s3v4"),
            region_name="us-east-1",
        )
        self._ensure_bucket()

    def _ensure_bucket(self):
        try:
            self.client.head_bucket(Bucket=self.bucket)
        except ClientError:
            self.client.create_bucket(Bucket=self.bucket)
            # make bucket publicly readable (for direct browser access)
            self.client.put_bucket_policy(
                Bucket=self.bucket,
                Policy=f"""{{
                    "Version": "2012-10-17",
                    "Statement": [{{
                        "Effect": "Allow",
                        "Principal": {{"AWS": ["*"]}},
                        "Action": ["s3:GetObject"],
                        "Resource": ["arn:aws:s3:::{self.bucket}/*"]
                    }}]
                }}""",
            )

    def upload_bytes(
        self, key: str, data: bytes, content_type: str = "image/jpeg"
    ) -> str:
        self.client.upload_fileobj(
            io.BytesIO(data),
            self.bucket,
            key,
            ExtraArgs={"ContentType": content_type},
        )
        return key

    def download_bytes(self, key: str) -> bytes:
        response = self.client.get_object(Bucket=self.bucket, Key=key)
        return response["Body"].read()

    def public_url(self, key: str) -> str:
        return f"{self.public_endpoint}/{self.bucket}/{key}"

    def presigned_url(self, key: str, expires_in: int = 3600) -> str:
        url = self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expires_in,
        )
        # replace internal docker hostname with public endpoint for browser
        return url.replace(settings.minio_endpoint, self.public_endpoint)

    def delete(self, key: str):
        self.client.delete_object(Bucket=self.bucket, Key=key)


minio = SSClient()
