# 🚆 Railway Deployment Guide

This project is optimized for deployment on Railway. Since it's a monorepo with multiple services, you will need to link your GitHub repository to Railway and create **three separate services**.

---

## 🏗️ 1. RAG Service (Python FastAPI)

1.  **Create Service**: Go to Railway -> New Project -> GitHub Repo -> Select this repo.
2.  **Settings**:
    - **Root Directory**: `rag-service`
    - **Build Command**: `pip install -r requirements.txt`
    - **Start Command**: `gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:$PORT`
3.  **Variables**:
    - `GEMINI_API_KEY`: (Your Google API Key)
    - `LLM_MODEL`: `gemini-1.5-flash`
    - `PYTHON_VERSION`: `3.10`
    - `NIXPACKS_PYTHON_VERSION`: `3.10`
4.  **Networking**: Railway will automatically assign a public URL. Copy this URL (e.g., `https://rag-service-production.up.railway.app`).

---

## 🌐 2. API Gateway (Node.js)

1.  **Create Service**: New -> GitHub Repo -> Select same repo.
2.  **Settings**:
    - **Root Directory**: `backend/api-gateway`
3.  **Variables**:
    - `MONGODB_URI`: (Your MongoDB Atlas Connection String)
    
    > [!WARNING]
    > **Do NOT use quotes** around variable values in the Railway Dashboard. 
    > Incorrect: `"mongodb+srv://..."`
    > Correct: `mongodb+srv://...`
    - `JWT_SECRET`: (Any random long string)
    - `RAG_SERVICE_URL`: (The public URL of the RAG Service created in Step 1)
    - `FRONTEND_URL`: (The URL of the Frontend service created in Step 3 - can update later)
    - `SMTP_USER`: (For OTP emails)
    - `SMTP_PASS`: (App Password for email)
4.  **Networking**: Copy this public URL (e.g., `https://api-gateway-production.up.railway.app`).

---

## 🎨 3. Frontend (React)

1.  **Create Service**: New -> GitHub Repo -> Select same repo.
2.  **Settings**:
    - **Root Directory**: `frontend`
    - **Build Command**: `npm run build`
    - **Start Command**: `npx serve -s build`
3.  **Variables**:
    - `REACT_APP_API_URL`: (The public URL of the API Gateway from Step 2 + `/api`)
      - *Example*: `https://api-gateway-production.up.railway.app/api`
4.  **Networking**: This is your final user-facing URL.

---

## 📂 Required Files Added

I have added the following files to help Railway auto-detect and run your services:
- `rag-service/Procfile`: Production server configuration for FastAPI.
- `backend/api-gateway/Procfile`: Start command for the Node.js gateway.
- `frontend/Procfile`: Production serving for the React build.

## ❌ Troubleshooting common issues

### 1. MongoDB Connection Failed (Bad Auth)
If you see `authentication failed` in the logs:
- **Special Characters**: If your password has `@`, `#`, `!`, etc., you **MUST** URL-encode them.
  - `@` becomes `%40`
  - `#` becomes `%23`
  - `!` becomes `%21`
- **Whitelist**: Go to MongoDB Atlas -> Network Access and ensure `0.0.0.0/0` is added.
- **Service Restart**: After changing the variable in Railway, the service should auto-restart. If not, click **Redeploy**.

### 2. Frontend cannot reach API
If the frontend loads but login/register fails:
- Check `REACT_APP_API_URL` in the Frontend service. It should be the **API Gateway URL** (not the RAG URL).
- Make sure it includes `/api` at the end.
- Verify `FRONTEND_URL` in the API Gateway service matches your frontend's Railway URL.
