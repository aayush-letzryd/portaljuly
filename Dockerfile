# ==============================================================================
# Stage 1: Build the React Frontend (Vite + TypeScript)
# ==============================================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Copy package manifests & install dependencies
COPY package*.json ./
RUN npm ci

# Copy frontend source code & build production bundle into /app/dist
COPY index.html vite.config.ts tsconfig.json ./
COPY src/ ./src/
COPY public/ ./public/
RUN npm run build

# ==============================================================================
# Stage 2: Production Python Backend (FastAPI + Uvicorn)
# ==============================================================================
FROM python:3.11-slim

# Prevent Python from writing .pyc files and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies needed for psycopg2 / network tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY main.py seed_access_control.py ./

# Copy compiled React frontend from Stage 1 into /app/dist
COPY --from=frontend-builder /app/dist ./dist

# Expose port (Cloud Run default 8080, Render default 8000/10000)
EXPOSE 8080 8000 10000

# Start Uvicorn ASGI server with dynamic $PORT binding
CMD sh -c "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"
