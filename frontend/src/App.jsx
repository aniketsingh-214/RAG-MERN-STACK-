import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import UploadPage from './pages/UploadPage';

function Spinner() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center flex-col gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
      <p className="text-zinc-500 text-sm font-mono">loading...</p>
    </div>
  );
}

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Spinner />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Spinner />;
  return !isAuthenticated ? children : <Navigate to="/chat" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#18181b', color: '#e4e4e7', border: '1px solid #3f3f46', fontFamily: 'Sora, sans-serif', fontSize: '14px' },
            success: { iconTheme: { primary: '#8b5cf6', secondary: '#18181b' } },
            error: { iconTheme: { primary: '#f87171', secondary: '#18181b' } }
          }}
        />
        <Routes>
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
          <Route path="/dashboard/upload" element={<PrivateRoute><UploadPage /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
