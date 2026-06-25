# MinIO image with the server start command baked in.
#
# Why this exists: Nexlayer's deploy API rejects the `command:` field in
# nexlayer.yaml (HTTP 500), but the stock minio/minio image has an empty
# server command and exits without one. The base image's ENTRYPOINT
# (/usr/bin/docker-entrypoint.sh) forwards CMD args to the `minio` binary,
# so baking the args into CMD here lets the pod start with no `command:`
# field in nexlayer.yaml.
#
# Credentials + bucket are still configured via env vars in nexlayer.yaml
# (MINIO_ROOT_USER / MINIO_ROOT_PASSWORD).
FROM mirror.gcr.io/minio/minio:latest

EXPOSE 9000 9001

CMD ["server", "/data", "--console-address", ":9001"]
