#!/bin/bash
# Script: scripts/run-chroma-docker.sh
# Tự động chạy ChromaDB Docker với config từ .env
set -a
[ -f .env ] && . .env
set +a

# Dùng CHROMA_PORT từ .env, mặc định 8000 nếu không có
PORT=${CHROMA_PORT:-8000}

# Chạy docker chromadb
exec docker run -d \
  -p ${PORT}:7978 \
  --name chromadb \
  ghcr.io/chroma-core/chroma:latest
