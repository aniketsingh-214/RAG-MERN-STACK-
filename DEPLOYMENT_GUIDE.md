# 🚀 Deployment Guide: Render

This project is optimized for deployment on **Render** using Web Services and Blueprints.

---

## 🎨 1. Frontend (Render Static Site)

1.  **Platform**: [Render](https://render.com/)
2.  **Service Type**: Static Site
3.  **Project Settings**:
    - **Build Command**: `npm run build`
    - **Publish Directory**: `frontend/dist`
4.  **Environment Variables**:
    - `VITE_API_URL`: The URL of your AI Gateway on Render (e.g., `https://api-gateway.onrender.com/api`)

---

## 🏗️ 2. Render Deployment (Recommended)

Render is the recommended platform as it supports persistent web services and internal networking.

### Option A: Blueprint Deployment (Fastest)
1.  Connect your GitHub repository to [Render](https://dashboard.render.com/).
2.  Click **"New"** -> **"Blueprint"**.
3.  Render will automatically detect the `render.yaml` file and configure both the **API Gateway** and **RAG Service**.
4.  Fill in the required Environment Variables in the Render Dashboard:
    - `MONGODB_URI`: Your MongoDB Atlas connection string.
    - `GEMINI_API_KEY`: Your Google Gemini API key.
    - `JWT_SECRET`: A random secret key for auth.
    - `FRONTEND_URL`: Your deployed frontend URL.

### Option B: Manual Web Service Deployment
If you prefer to set them up manually:

#### **API Gateway**
- **Service Type**: Web Service
- **Runtime**: Node
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment Variables**: Add all from `.env`, ensuring `PORT` is `10000`.

#### **RAG Service**
- **Service Type**: Web Service
- **Runtime**: Python
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `chmod +x start.sh && ./start.sh`
- **Environment Variables**: Add all from `.env`, ensuring `PORT` is `8000`.

> [!IMPORTANT]
> **Internal Networking**: When using the Blueprint, the `RAG_SERVICE_URL` is automatically configured to use Render's internal network (e.g., `http://rag-service:8000`), which is faster and more secure.

---

## 📧 Email Configuration (SMTP)

We use **SMTP** via Nodemailer for reliable email delivery.
- **Port**: 465
- **Security**: SSL (secure: true)
- **Authentication**: Use a **Gmail App Password**, not your regular password.

---

## ⚠️ Persistence Note
Render's free tier uses ephemeral storage. The vector database (`./vectorstore`) and uploaded documents will be reset on service restarts. For permanent storage, consider:
1. Using Render's **Disk** mount (Paid tier).
2. Switching to a managed vector database like **MongoDB Atlas Vector Search**.
