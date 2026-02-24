"""Object storage service — wraps boto3 for MinIO (dev) and AWS S3 (prod)."""

import logging
import os

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

_s3_client = None


def get_s3_client():
    """Return a cached boto3 S3 client configured from environment variables."""
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client(
            "s3",
            endpoint_url=os.getenv("STORAGE_ENDPOINT_URL"),
            aws_access_key_id=os.getenv("STORAGE_ACCESS_KEY"),
            aws_secret_access_key=os.getenv("STORAGE_SECRET_KEY"),
        )
    return _s3_client


def ensure_bucket_exists(bucket: str) -> None:
    """Create the bucket if it does not exist. Safe to call on every startup."""
    client = get_s3_client()
    try:
        client.create_bucket(Bucket=bucket)
    except ClientError as e:
        code = e.response["Error"]["Code"]
        if code not in ("BucketAlreadyOwnedByYou", "BucketAlreadyExists"):
            raise


def upload_file(file_bytes: bytes, key: str, content_type: str) -> None:
    """Upload bytes to the storage bucket under the given key."""
    bucket = os.getenv("STORAGE_BUCKET_NAME", "discovery-files")
    get_s3_client().put_object(
        Bucket=bucket,
        Key=key,
        Body=file_bytes,
        ContentType=content_type,
    )


def delete_file(key: str) -> None:
    """Delete an object from the storage bucket. Logs on failure — does not raise."""
    bucket = os.getenv("STORAGE_BUCKET_NAME", "discovery-files")
    try:
        get_s3_client().delete_object(Bucket=bucket, Key=key)
    except Exception as exc:
        logger.warning("Failed to delete file from storage: key=%s error=%s", key, exc)
