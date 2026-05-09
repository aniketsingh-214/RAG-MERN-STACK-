# 🚀 Deployment Guide: Netlify & Vercel

This project is now configured for deployment on **Netlify** (Backend & RAG) and **Vercel** (Frontend).

---

## 🎨 1. Frontend (Vercel)

1.  **Platform**: [Vercel](https://vercel.com/)
2.  **Project Settings**:
    - **Framework Preset**: Vite
    - **Root Directory**: `frontend`
    - **Build Command**: `npm run build`
    - **Output Directory**: `dist`
3.  **Environment Variables**:
    - `VITE_API_URL`: The URL of your AI Gateway on Netlify (e.g., `https://your-api-gateway.netlify.app/api`)

---

## 🌐 2. AI Gateway (Netlify)

1.  **Platform**: [Netlify](https://app.netlify.com/)
2.  **Project Settings**:
    - **Root Directory**: `backend/api-gateway`
    - **Build Command**: `npm install`
    - **Functions Directory**: `netlify/functions`
3.  **Environment Variables**:
    - `MONGODB_URI`: Your MongoDB Atlas connection string.
    - `JWT_SECRET`: A random secret key.
    - `SMTP_HOST`: `smtp.gmail.com`
    - `SMTP_PORT`: `465` (Recommended for SSL)
    - `SMTP_SECURE`: `true`
    - `SMTP_USER`: Your Gmail address.
    - `SMTP_PASS`: Your Gmail App Password.
    - `RAG_SERVICE_URL`: The URL of your RAG Service on Netlify (e.g., `https://your-rag-service.netlify.app`)
    - `FRONTEND_URL`: Your Vercel frontend URL.

---

## 🏗️ 3. RAG Service (Netlify)

1.  **Platform**: [Netlify](https://app.netlify.com/)
2.  **Project Settings**:
    - **Root Directory**: `rag-service`
    - **Build Command**: `pip install -r requirements.txt`
    - **Functions Directory**: `netlify/functions`
3.  **Environment Variables**:
    - `GEMINI_API_KEY`: Your Google Gemini API key.
    - `LLM_MODEL`: `gemini-1.5-flash`

> [!WARNING]
> **Persistence Note**: Netlify Functions are serverless and have an ephemeral filesystem. Local storage (like `./vectorstore` or `./documents`) will be lost between requests. For production use, consider using a managed vector database (like MongoDB Atlas Vector Search or Pinecone).

---

## 📧 Email Configuration (SMTP)

We have reverted to the **SMTP-based approach** using Nodemailer. 
- Use **Port 465** with **SSL (secure: true)** for the best compatibility in cloud environments.
- Ensure you use a **Gmail App Password**, not your regular password.
