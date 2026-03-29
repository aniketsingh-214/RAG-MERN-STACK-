import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, User, Mail, Phone, Calendar, Save, Sparkles, LogOut } from 'lucide-react';
import { userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', dob: '' });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await userAPI.getProfile();
        const u = res.data.user;
        setForm({ name: u.name || '', phone: u.phone || '', dob: u.dob ? format(new Date(u.dob), 'yyyy-MM-dd') : '' });
      } catch { toast.error('Failed to load profile'); } finally { setFetching(false); }
    })();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await userAPI.updateProfile(form);
      updateUser(res.data.user);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally { setLoading(false); }
  };

  const fields = [
    { key: 'name', label: 'Full name', icon: User, type: 'text', editable: true },
    { key: 'email', label: 'Email address', icon: Mail, type: 'email', editable: false, value: user?.email },
    { key: 'phone', label: 'Phone number', icon: Phone, type: 'tel', editable: true },
    { key: 'dob', label: 'Date of birth', icon: Calendar, type: 'date', editable: true }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-900/20 via-zinc-950 to-zinc-950 pointer-events-none" />
      <header className="relative border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/chat" className="w-9 h-9 rounded-xl border border-zinc-700 hover:border-zinc-600 flex items-center justify-center text-zinc-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">RAG Assistant</span>
          </div>
        </div>
        <button onClick={logout} className="flex items-center gap-2 text-zinc-400 hover:text-red-400 text-sm transition">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </header>
      <main className="relative max-w-2xl mx-auto px-6 py-12">
        <div className="animate-fade-in">
          <div className="flex items-center gap-5 mb-10">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{user?.name || 'Your Profile'}</h1>
              <p className="text-zinc-400 text-sm mt-1">{user?.email}</p>
            </div>
          </div>
          {fetching ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-6">
              <h2 className="text-lg font-semibold text-white">Account details</h2>
              {fields.map(({ key, label, icon: Icon, type, editable, value: fixedVal }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">{label}</label>
                  <div className="relative">
                    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input type={type} value={editable ? form[key] : (fixedVal || '')}
                      onChange={editable ? e => setForm(f => ({ ...f, [key]: e.target.value })) : undefined}
                      disabled={!editable}
                      className={`w-full bg-zinc-800 border rounded-xl pl-10 pr-4 py-3 text-sm transition focus:outline-none
                        ${editable ? 'border-zinc-700 text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500' : 'border-zinc-800 text-zinc-500 cursor-not-allowed'}`} />
                    {!editable && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-600 bg-zinc-900 px-1.5 py-0.5 rounded">locked</span>}
                  </div>
                </div>
              ))}
              <div className="pt-2">
                <button type="submit" disabled={loading}
                  className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl transition text-sm">
                  {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save className="w-4 h-4" /> Save changes</>}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
