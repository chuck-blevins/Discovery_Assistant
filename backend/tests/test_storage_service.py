"""
Unit tests for storage_service.

All boto3 calls are mocked — no real MinIO or S3 required.
"""

import os
from unittest.mock import MagicMock, patch

import pytest


class TestGetS3Client:
    def test_returns_client(self):
        import app.services.storage_service as svc
        # Reset cached client
        svc._s3_client = None
        mock_client = MagicMock()
        with patch("app.services.storage_service.boto3.client", return_value=mock_client):
            client = svc.get_s3_client()
        assert client is mock_client

    def test_client_is_cached(self):
        import app.services.storage_service as svc
        svc._s3_client = None
        mock_client = MagicMock()
        with patch("app.services.storage_service.boto3.client", return_value=mock_client) as mock_ctor:
            svc.get_s3_client()
            svc.get_s3_client()
        # boto3.client() should only be called once
        assert mock_ctor.call_count == 1


class TestEnsureBucketExists:
    def test_creates_bucket(self):
        import app.services.storage_service as svc
        mock_client = MagicMock()
        svc._s3_client = mock_client
        svc.ensure_bucket_exists("my-bucket")
        mock_client.create_bucket.assert_called_once_with(Bucket="my-bucket")

    def test_ignores_bucket_already_owned(self):
        import app.services.storage_service as svc
        from botocore.exceptions import ClientError
        mock_client = MagicMock()
        mock_client.create_bucket.side_effect = ClientError(
            {"Error": {"Code": "BucketAlreadyOwnedByYou", "Message": ""}}, "CreateBucket"
        )
        svc._s3_client = mock_client
        # Should not raise
        svc.ensure_bucket_exists("my-bucket")

    def test_ignores_bucket_already_exists(self):
        import app.services.storage_service as svc
        from botocore.exceptions import ClientError
        mock_client = MagicMock()
        mock_client.create_bucket.side_effect = ClientError(
            {"Error": {"Code": "BucketAlreadyExists", "Message": ""}}, "CreateBucket"
        )
        svc._s3_client = mock_client
        svc.ensure_bucket_exists("my-bucket")

    def test_raises_on_other_client_error(self):
        import app.services.storage_service as svc
        from botocore.exceptions import ClientError
        mock_client = MagicMock()
        mock_client.create_bucket.side_effect = ClientError(
            {"Error": {"Code": "AccessDenied", "Message": ""}}, "CreateBucket"
        )
        svc._s3_client = mock_client
        with pytest.raises(ClientError):
            svc.ensure_bucket_exists("my-bucket")


class TestUploadFile:
    def test_put_object_called_with_correct_args(self, monkeypatch):
        import app.services.storage_service as svc
        mock_client = MagicMock()
        svc._s3_client = mock_client
        monkeypatch.setenv("STORAGE_BUCKET_NAME", "test-bucket")

        svc.upload_file(b"file content", "project-1/ds-1/file.txt", "text/plain")

        mock_client.put_object.assert_called_once_with(
            Bucket="test-bucket",
            Key="project-1/ds-1/file.txt",
            Body=b"file content",
            ContentType="text/plain",
        )


class TestDeleteFile:
    def test_delete_object_called(self, monkeypatch):
        import app.services.storage_service as svc
        mock_client = MagicMock()
        svc._s3_client = mock_client
        monkeypatch.setenv("STORAGE_BUCKET_NAME", "test-bucket")

        svc.delete_file("project-1/ds-1/file.txt")

        mock_client.delete_object.assert_called_once_with(
            Bucket="test-bucket",
            Key="project-1/ds-1/file.txt",
        )

    def test_delete_file_swallows_error(self, monkeypatch):
        import app.services.storage_service as svc
        mock_client = MagicMock()
        mock_client.delete_object.side_effect = Exception("Connection refused")
        svc._s3_client = mock_client
        monkeypatch.setenv("STORAGE_BUCKET_NAME", "test-bucket")

        # Should NOT raise — best-effort deletion
        svc.delete_file("some/key.txt")
