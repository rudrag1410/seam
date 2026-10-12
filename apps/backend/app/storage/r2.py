"""Cloudflare R2 through its S3-compatible API. Private bucket; downloads via presigned URLs."""

import anyio.to_thread
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.core.config import Settings


def make_r2_client(s: Settings):
    return boto3.client(
        "s3",
        endpoint_url=s.r2_endpoint,
        aws_access_key_id=s.r2_access_key_id,
        aws_secret_access_key=s.r2_secret_access_key,
        region_name="auto",
        config=Config(
            signature_version="s3v4",
            retries={"max_attempts": 3, "mode": "standard"},
            request_checksum_calculation="when_required",
            response_checksum_validation="when_required",
        ),
    )


class R2Storage:
    def __init__(self, settings: Settings) -> None:
        self._client = make_r2_client(settings)
        self._bucket = settings.r2_bucket

    async def put(self, key: str, data: bytes, content_type: str) -> None:
        await anyio.to_thread.run_sync(self._put, key, data, content_type)

    async def get(self, key: str) -> bytes:
        return await anyio.to_thread.run_sync(self._read, key)

    async def exists(self, key: str) -> bool:
        return await anyio.to_thread.run_sync(self._head, key)

    async def delete_prefix(self, prefix: str) -> None:
        await anyio.to_thread.run_sync(self._purge, prefix)

    # boto3 is blocking, so each call below runs on a worker thread

    def _put(self, key: str, data: bytes, content_type: str) -> None:
        self._client.put_object(Bucket=self._bucket, Key=key, Body=data, ContentType=content_type)

    def _read(self, key: str) -> bytes:
        return self._client.get_object(Bucket=self._bucket, Key=key)["Body"].read()

    def _head(self, key: str) -> bool:
        try:
            self._client.head_object(Bucket=self._bucket, Key=key)
            return True
        except ClientError:
            return False

    def _purge(self, prefix: str) -> None:
        pager = self._client.get_paginator("list_objects_v2")
        for page in pager.paginate(Bucket=self._bucket, Prefix=prefix):
            objs = [{"Key": o["Key"]} for o in page.get("Contents", [])]
            if objs:
                self._client.delete_objects(Bucket=self._bucket, Delete={"Objects": objs})

    def presign(self, key: str, filename: str, ttl_s: int) -> str | None:
        return self._client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": self._bucket,
                "Key": key,
                "ResponseContentDisposition": f'attachment; filename="{filename}"',
            },
            ExpiresIn=ttl_s,
        )
