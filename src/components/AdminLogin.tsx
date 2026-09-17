import { useState, type FormEvent } from 'react';
import { User, Lock, Shield, Loader2, AlertCircle } from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuthContext';

export default function AdminLogin() {
  const { login, loading, error } = useAdminAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    login(username.trim(), password.trim());
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30 mb-5">
            <Shield className="w-10 h-10 text-white" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Admin Portal</h1>
          <p className="text-slate-400 text-sm mt-1.5">Delivery Run Management</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl"
        >
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full bg-slate-800/60 text-white text-base rounded-xl pl-11 pr-4 py-3.5 border border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all placeholder:text-slate-600"
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-800/60 text-white text-base rounded-xl pl-11 pr-4 py-3.5 border border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all placeholder:text-slate-600"
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password.trim()}
            className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold text-base rounded-xl py-3.5 flex items-center justify-center gap-2 hover:from-sky-400 hover:to-blue-500 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            Default: <span className="text-slate-400 font-mono">admin</span> / <span className="text-slate-400 font-mono">admin123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
