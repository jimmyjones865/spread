#!/bin/sh
# Ensure /data is owned by the app user. Handles the case where the volume
# was created by a previous root-running container.
chown -R app:app /data
exec su-exec app "$@"
