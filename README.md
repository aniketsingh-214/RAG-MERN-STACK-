# RAG Assistant - MERN + Microservices

A production-ready full-stack AI application with React frontend, two Node.js microservices, and a Python FastAPI RAG service.

## Architecture

```
React Frontend (port 3000)
       |
API Gateway - Node.js (port 5001)
   Auth (OTP/JWT) | User CRUD | Chat Storage
       |
RAG Connector - Node.js (port 5002)
   Redis Cache | Retry Logic | Timeout Handling
       |
RAG Service - Python FastAPI (port 8000)
   PDF Ingestion | FAISS | LangChain | OpenAI
       |
MongoDB (port 27017)  +  Redis (port 6379)
```

## Quick Start (Docker)

1. Copy and fill environment files:
```bash
cp backend/api-gateway/.env.example   backend/api-gateway/.env
cp backend/rag-connector/.env.example backend/rag-connector/.env
cp rag-service/.env.example           rag-service/.env
```

2. Required secrets:
   - `backend/api-gateway/.env`: Set `JWT_SECRET`, `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `INTERNAL_API_KEY`
   - `backend/rag-connector/.env`: Set same `INTERNAL_API_KEY`
   - `rag-service/.env`: Set `OPENAI_API_KEY`

3. Launch:
```bash
docker compose up --build
```

Open http://localhost:3000

## Local Development

Terminal 1 - RAG Service:
```bash
cd rag-service && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && cp .env.example .env
uvicorn main:app --port 8000 --reload
```

Terminal 2 - RAG Connector:
```bash
cd backend/rag-connector && npm install && cp .env.example .env
npm run dev
```

Terminal 3 - API Gateway:
```bash
cd backend/api-gateway && npm install && cp .env.example .env
npm run dev
```

Terminal 4 - Frontend:
```bash
cd frontend && npm install && npm start
```

## API Endpoints

### Auth
- `POST /api/auth/send-otp` - Send OTP to email
- `POST /api/auth/verify-otp` - Verify OTP, receive JWT
- `POST /api/auth/logout` - Logout (Bearer)
- `GET  /api/auth/me` - Current user (Bearer)

### User
- `GET  /api/user/profile` - Get profile (Bearer)
- `PUT  /api/user/profile` - Update profile (Bearer)

### Chat
- `POST /api/chat/send-query` - Send query (Bearer)
- `GET  /api/chat/history` - Chat history (Bearer)
- `DELETE /api/chat/:id` - Delete chat (Bearer)

### RAG Service (internal)
- `POST /query` - Query documents
- `POST /upload` - Upload PDF
- `GET  /stats` - Pipeline stats
- `DELETE /cache` - Clear cache

## Tech Stack
- **Frontend**: React 18, Tailwind CSS, React Router, Axios
- **API Gateway**: Node.js, Express, Mongoose, Nodemailer, JWT
- **RAG Connector**: Node.js, Express, ioredis, Axios
- **RAG Service**: Python, FastAPI, LangChain, FAISS, HuggingFace Embeddings, OpenAI
- **Database**: MongoDB, Redis
- **DevOps**: Docker, Docker Compose, Nginx
