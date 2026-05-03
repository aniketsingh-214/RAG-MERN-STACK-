# RAG Assistant - MERN + FastAPI (Simplified Architecture)

A robust, multi-user Retrieval-Augmented Generation (RAG) application. This version features a simplified architecture optimized for deployment on Render (Backend) and Vercel (Frontend).

## 🏗️ Architecture

```
React Frontend (Vercel)
        |
API Gateway - Node.js (Render)
    Auth (OTP/JWT) | User CRUD | Chat History | Document Metadata
        |
RAG Service - Python FastAPI (Render)
    PDF Ingestion | ChromaDB (Local/Persistent) | Gemini AI
        |
MongoDB Atlas
```

### Key Enhancements:
- **Simplified Backend**: Removed the intermediary `rag-connector`. The API Gateway now communicates directly with the RAG service.
- **Multi-User Aware**: Documents are indexed into user-specific collections. Users can only query their own uploaded data.
- **Improved UI**: Streamlined OTP verification and a dedicated document management dashboard.
- **Zero Redis Dependency**: Architecture simplified to work without Redis for easier deployment.

---

## 🚀 Local Development

### 1. Prerequisites
- Node.js & npm
- Python 3.9+
- MongoDB (Local or Atlas)
- Gemini API Key (Google AI Studio)

### 2. Setup RAG Service (Python)
```bash
cd rag-service
python -m venv .venv
# Windows: .venv\Scripts\activate | Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env # Add your GEMINI_API_KEY
uvicorn main:app --port 8000 --reload
```

### 3. Setup API Gateway (Node.js)
```bash
cd backend/api-gateway
npm install
cp .env.example .env # Set MONGODB_URI, JWT_SECRET, and RAG_SERVICE_URL (http://localhost:8000)
npm run dev
```

### 4. Setup Frontend (React)
```bash
cd frontend
npm install
npm start
```

---

## 🛠️ API Endpoints

### Auth & User
- `POST /api/auth/send-otp` - Send verification code
- `POST /api/auth/verify-otp` - Verify code & login
- `GET  /api/user/profile` - User account details

### Knowledge Base (Document Upload)
- `POST /api/upload` - Upload & index a PDF (Multi-user)
- `GET  /api/upload` - List user's indexed documents
- `DELETE /api/upload/:id` - Remove a document from index

### Chat & RAG
- `POST /api/chat/send-query` - Query your documents
- `GET  /api/chat/history` - Retrieve chat history

---

## 🧰 Tech Stack
- **Frontend**: React 18, Tailwind CSS, Lucide Icons, React Dropzone
- **API Gateway**: Node.js, Express, Mongoose (MongoDB), Nodemailer (OTP)
- **RAG Service**: Python FastAPI, ChromaDB (Vector Store), PyPDF, Google Generative AI (Gemini)
- **Database**: MongoDB Atlas
- **Deployment**: Vercel (Frontend), Render (Backends)

---

## 🔐 Environment Variables

### API Gateway
- `MONGODB_URI`: Connection string
- `JWT_SECRET`: Signing key
- `RAG_SERVICE_URL`: URL of the FastAPI service
- `SMTP_*`: Credentials for OTP emails

### RAG Service
- `GEMINI_API_KEY`: Your Google AI API key
- `VECTORSTORE_PATH`: Path for ChromaDB storage
