import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { User, Mail, Phone, Calendar, ArrowRight, Sparkles } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import OTPInput from '../components/auth/OTPInput';

export default function RegisterPage() {
  const [step, setStep] = useState('form');
  const [form, setForm] = useState({ name: '', email: '', phone: '', dob: '' });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.sendOTP({ ...form, isRegistration: true });
      setStep('otp');
      toast.success('OTP sent! Check your email.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const res = await authAPI.verifyOTP(form.email, otp);
      login(res.data.token, res.data.user);
      toast.success(`Welcome, ${res.data.user.name}!`);
      navigate('/chat');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid OTP');
      setOtp('');
    } finally { setLoading(false); }
  };

  const fields = [
    { name: 'name', label: 'Full name', placeholder: 'Jane Smith', icon: User, type: 'text', required: true },
    { name: 'email', label: 'Email address', placeholder: 'you@example.com', icon: Mail, type: 'email', required: true },
    { name: 'phone', label: 'Phone number', placeholder: '+1 234 567 8900', icon: Phone, type: 'tel', required: false },
    { name: 'dob', label: 'Date of birth', placeholder: '', icon: Calendar, type: 'date', required: false }
  ];

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
          <p className="text-zinc-400 text-sm">Create your account</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-2xl font-bold text-white mb-1">{step === 'form' ? 'Create account' : 'Verify email'}</h1>
          <p className="text-zinc-400 text-sm mb-8">
            {step === 'form' ? 'Fill in your details to get started' : `Enter the 6-digit code sent to ${form.email}`}
          </p>
          {step === 'form' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {fields.map(({ name, label, placeholder, icon: Icon, type, required }) => (
                <div key={name}>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    {label}{required && <span className="text-brand-400 ml-1">*</span>}
                  </label>
                  <div className="relative">
                    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input type={type} name={name} value={form[name]} onChange={handleChange}
                      placeholder={placeholder} required={required}
                      className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition" />
                  </div>
                </div>
              ))}
              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition text-sm mt-2">
                {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><span>Send OTP</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-5">
              <OTPInput value={otp} onChange={setOtp} length={6} />
              <button type="submit" disabled={loading || otp.length !== 6}
                className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition text-sm">
                {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Verify & Create Account'}
              </button>
            </form>
          )}
          <p className="text-center text-zinc-500 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
