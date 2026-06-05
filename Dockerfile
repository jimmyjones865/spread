# Stage 1: build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: backend + built frontend
FROM python:3.12-alpine
RUN apk add --no-cache jpeg-dev zlib-dev libwebp-dev libavif-dev gcc musl-dev su-exec
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir --no-binary=pillow -r requirements.txt
COPY backend/ ./
COPY --from=frontend-builder /build/dist ./static
COPY entrypoint.sh /entrypoint.sh
RUN mkdir -p /data/images && \
    adduser -D -u 1000 app && \
    chmod +x /entrypoint.sh
EXPOSE 8000
ENTRYPOINT ["/entrypoint.sh"]
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
