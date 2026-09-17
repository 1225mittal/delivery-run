import { useState, type FormEvent } from 'react';
import { Phone, Lock, Truck, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const { login, loading, error } = useAuth();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !pin.trim()) return;
    login(phone.trim(), pin.trim());
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-5">
            <Truck className="w-10 h-10 text-white" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Delivery Run</h1>
          <p className="text-slate-400 text-sm mt-1.5">Sign in to start your deliveries</p>
        </div>

        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl"
        >
          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                maxLength={10}
                className="w-full bg-slate-800/60 text-white text-base rounded-xl pl-11 pr-4 py-3.5 border border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-600"
                autoComplete="tel"
              />
            </div>
          </div>

          {/* PIN */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">PIN</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                maxLength={4}
                className="w-full bg-slate-800/60 text-white text-base rounded-xl pl-11 pr-4 py-3.5 border border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-600 tracking-[0.5em]"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !phone.trim() || !pin.trim()}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-base rounded-xl py-3.5 flex items-center justify-center gap-2 hover:from-emerald-400 hover:to-teal-500 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
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

        {/* Demo credentials hint */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            Demo: phone <span className="text-slate-400 font-mono">9876543210</span> · PIN <span className="text-slate-400 font-mono">1234</span>
          </p>
        </div>
      </div>
    </div>
  );
}
