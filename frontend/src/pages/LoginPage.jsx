import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, ArrowRight, RotateCcw, Sparkles } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import OTPInput from '../components/auth/OTPInput';

export default function LoginPage() {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await authAPI.sendOTP({ email: email.trim() });
      setStep('otp');
      toast.success('OTP sent to your email');
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === 'USER_NOT_FOUND') toast.error('Email not registered. Please sign up first.');
      else toast.error(err.response?.data?.error || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const res = await authAPI.verifyOTP(email, otp);
      login(res.data.token, res.data.user);
      toast.success(`Welcome back, ${res.data.user.name}!`);
      navigate('/chat');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid OTP');
      setOtp('');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-900/30 via-zinc-950 to-zinc-950 pointer-events-none" />
      <div className="relative w-full max-w-md animate-fade-in">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">RAG Assistant</span>
          </div>
          <p className="text-zinc-400 text-sm">AI-powered document intelligence</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-2xl font-bold text-white mb-1">{step === 'email' ? 'Sign in' : 'Enter OTP'}</h1>
          <p className="text-zinc-400 text-sm mb-8">
            {step === 'email' ? 'Enter your email to receive a one-time code' : `We sent a 6-digit code to ${email}`}
          </p>
          {step === 'email' ? (
            <form onSubmit={handleSendOTP} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" required
                    className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition" />
                </div>
              </div>
              <button type="submit" disabled={loading || !email.trim()}
                className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition text-sm">
                {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><span>Send OTP</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-5">
              <OTPInput value={otp} onChange={setOtp} length={6} />
              <button type="submit" disabled={loading || otp.length !== 6}
                className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition text-sm">
                {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Verify & Sign In'}
              </button>
              <button type="button" onClick={() => { setStep('email'); setOtp(''); }}
                className="w-full flex items-center justify-center gap-2 text-zinc-400 hover:text-white text-sm transition">
                <RotateCcw className="w-3.5 h-3.5" /> Change email
              </button>
            </form>
          )}
          <p className="text-center text-zinc-500 text-sm mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium transition">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
