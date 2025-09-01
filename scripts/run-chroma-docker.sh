#!/bin/bash
# Script: scripts/run-chroma-docker.sh
# Tự động chạy ChromaDB Docker với config từ .env và khởi động lại tự động

set -a
[ -f .env ] && . .env
set +a

# Sử dụng CHROMA_PORT từ .env, mặc định 7978 nếu không có
PORT=${CHROMA_PORT:-7978}

# Chạy docker chromadb với tùy chọn tự khởi động lại
exec docker run -d \
  -p ${PORT}:8000 \
  --name chromadb \
  --restart always \
  ghcr.io/chroma-core/chroma:latest