# Thay đổi cần thực hiện cho Embedding Server để tương thích với Mastra

## Tổng quan

Để khắc phục lỗi "No embedding function configuration found for collection memory_messages_1024" và tăng tính tương thích của embedding server với Mastra, cần thực hiện các thay đổi sau trong mã nguồn Python của server.

## 1. Thêm endpoint hỗ trợ liệt kê models (/v1/models)

Mastra cần endpoint này để xác minh mô hình embedding có sẵn.

### 1.1. Thêm import cần thiết

```python
from fastapi import FastAPI, HTTPException
import os
```

### 1.2. Thêm endpoint GET /v1/models

```python
@app.get("/v1/models")
async def list_models():
    model_name = os.environ.get("EMBED_MODEL_NAME", "BAAI/bge-m3-unsupervised")
    return {
        "object": "list",
        "data": [
            {
                "id": model_name,
                "object": "model",
                "created": 1677610602,  # Unix timestamp
                "owned_by": "your-embedding-server"
            }
        ]
    }
```

### 1.3. Thêm endpoint GET /v1/models/{model}

```python
@app.get("/v1/models/{model}")
async def get_model(model: str):
    expected_model = os.environ.get("EMBED_MODEL_NAME", "BAAI/bge-m3-unsupervised")
    if model != expected_model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    return {
        "id": model,
        "object": "model",
        "created": 1677610602,  # Unix timestamp
        "owned_by": "your-embedding-server"
    }
```

## 2. Đảm bảo định dạng response của endpoint /v1/embeddings đúng chuẩn OpenAI

### 2.1. Kiểm tra cấu trúc response hiện tại

Đảm bảo endpoint `/v1/embeddings` trả về đúng định dạng như sau:

```python
@app.post("/v1/embeddings")
async def create_embeddings(request: EmbeddingRequest):
    # ... xử lý logic hiện tại ...
    
    # Đảm bảo response có định dạng đúng
    embeddings_data = []
    for i, embedding in enumerate(embeddings):
        embeddings_data.append({
            "object": "embedding",
            "embedding": embedding.tolist() if hasattr(embedding, 'tolist') else embedding,
            "index": i
        })
    
    return {
        "object": "list",
        "data": embeddings_data,
        "model": os.environ.get("EMBED_MODEL_NAME", "BAAI/bge-m3-unsupervised"),
        "usage": {
            "prompt_tokens": total_tokens,
            "total_tokens": total_tokens
        }
    }
```

### 2.2. Kiểm tra cấu trúc dữ liệu đầu vào

Đảm bảo `EmbeddingRequest` có cấu trúc đúng:

```python
from pydantic import BaseModel
from typing import Union, List

class EmbeddingRequest(BaseModel):
    input: Union[str, List[str]]
    model: str = None
    encoding_format: str = "float"  # hoặc "base64"
```

## 3. Xử lý trường hợp encoding_format là "base64"

Nếu Mastra gửi yêu cầu với `encoding_format: "base64"`, server cần hỗ trợ:

```python
import base64
import numpy as np

def encode_embedding_to_base64(embedding):
    # Chuyển numpy array thành bytes
    embedding_bytes = np.array(embedding, dtype=np.float32).tobytes()
    # Encode thành base64
    return base64.b64encode(embedding_bytes).decode('utf-8')

# Trong endpoint /v1/embeddings
if request.encoding_format == "base64":
    # Chuyển đổi embedding sang base64
    processed_embedding = encode_embedding_to_base64(embedding)
else:
    # Giữ nguyên định dạng float
    processed_embedding = embedding.tolist() if hasattr(embedding, 'tolist') else embedding
```

## 4. Kiểm tra và xử lý các headers yêu cầu

OpenAI API yêu cầu một số headers nhất định, server cần xử lý chúng:

```python
from fastapi import Header

@app.post("/v1/embeddings")
async def create_embeddings(
    request: EmbeddingRequest,
    authorization: str = Header(None),
    content_type: str = Header(None)
):
    # Kiểm tra API key nếu cần
    # Xử lý logic hiện tại
    pass
```

## 5. Cấu hình CORS đúng cách

Đảm bảo CORS được cấu hình để cho phép các origin mà Mastra sử dụng:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Hoặc danh sách các origin cụ thể
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 6. Kiểm tra cấu hình môi trường

Đảm bảo các biến môi trường sau được thiết lập đúng trong file `.env` hoặc environment:

```
EMBED_MODEL_NAME=BAAI/bge-m3-unsupervised
EMBED_DEVICE=cuda  # hoặc cpu
EMBED_MAX_ITEMS=100
EMBED_MAX_TEXT_LEN=8192
```

## 7. Kiểm tra khả năng kết nối

### 7.1. Kiểm tra server đang chạy

```bash
curl http://100.122.140.63:7979/v1/health
```

### 7.2. Kiểm tra endpoint models

```bash
curl http://100.122.140.63:7979/v1/models
```

### 7.3. Kiểm tra endpoint embeddings

```bash
curl -X POST http://100.122.140.63:7979/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Hello world",
    "model": "BAAI/bge-m3-unsupervised"
  }'
```

## 8. Xử lý lỗi và logging

Thêm logging chi tiết để dễ debug:

```python
import logging

logger = logging.getLogger(__name__)

@app.post("/v1/embeddings")
async def create_embeddings(request: EmbeddingRequest):
    logger.info(f"Received embedding request for model: {request.model}")
    logger.info(f"Input data: {request.input}")
    
    try:
        # Xử lý logic
        # ...
        logger.info("Embedding generation successful")
        return response
    except Exception as e:
        logger.error(f"Error generating embeddings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
```

## 9. Kiểm tra với Mastra

Sau khi thực hiện các thay đổi, kiểm tra lại với Mastra:

1. Khởi động lại embedding server
2. Kiểm tra log của ứng dụng Mastra để xem lỗi đã được khắc phục chưa
3. Thử gửi một vài tin nhắn để kiểm tra chức năng semantic recall hoạt động đúng

## 10. Các điểm cần lưu ý

1. **Tính nhất quán của model name**: Đảm bảo tên model trong response luôn khớp với tên model trong request và biến môi trường
2. **Xử lý batch**: Hỗ trợ cả input là string đơn và list of strings
3. **Token counting**: Cung cấp thông tin usage chính xác
4. **Error handling**: Trả về HTTP status codes phù hợp khi có lỗi
5. **Performance**: Tối ưu hóa việc encode embeddings để đảm bảo hiệu suất

Thực hiện các thay đổi trên sẽ giúp embedding server của bạn tương thích hoàn toàn với Mastra và khắc phục lỗi "No embedding function configuration found".