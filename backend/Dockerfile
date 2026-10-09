FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 \
    HF_HOME=/opt/hf

WORKDIR /app

# CPU-only PyTorch first, so sentence-transformers doesn't pull the multi-GB CUDA build.
RUN pip install --default-timeout=600 torch --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --default-timeout=600 -r requirements.txt

# Bake the embedding model into the image, then forbid downloads at runtime.
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"
ENV HF_HUB_OFFLINE=1

COPY . .

RUN useradd --system --uid 10001 --home-dir /app app && chown -R app /app
USER app

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
