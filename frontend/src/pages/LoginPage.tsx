import React, { useState } from 'react';
import { useMainStore } from '../store/mainStore';

interface LoginPageProps {
  onNavigate: (page: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const loginAction = useMainStore((state) => state.login);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all credentials.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Cognitive sync failed. Verify your email or passcode.');
      }

      // Successful login
      loginAction(data.token, data.user);
      
      // Redirect to dashboard or smartboard depending on role
      if (data.user.role === 'teacher') {
        onNavigate('teacher');
      } else {
        onNavigate('dashboard');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Verification link timed out. System offline.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative p-6 bg-[#03001e] overflow-hidden selection:bg-cyan-500 selection:text-black">
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#1f1a3a_1px,transparent_1px),linear-gradient(to_bottom,#1f1a3a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />
      
      <div className="z-10 w-full max-w-md glass-panel p-8 rounded-3xl border border-cyan-500/20 shadow-2xl relative">
        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyan-400" />
        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-cyan-400" />
        
        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold font-outfit tracking-wide bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            ACCESS SANCTUM
          </h2>
          <p className="text-[10px] font-mono tracking-widest text-cyan-400/70 uppercase mt-2">
            Input Cognitive Credentials
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-6 p-3 bg-red-950/40 border border-red-500/30 rounded-xl flex items-center space-x-3 text-red-400 font-mono text-xs animate-shake">
            <span>⚠️</span>
            <p className="flex-1 text-left leading-relaxed">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email input */}
          <div className="text-left">
            <label className="block text-[10px] font-mono tracking-widest text-gray-400 uppercase mb-1.5 ml-1">
              Cognitive Node (Email)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. aarav@gmail.com"
              disabled={loading}
              className="w-full bg-[#0a0a23]/60 border border-cyan-500/10 focus:border-cyan-400/60 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-400/40 transition-all font-mono"
            />
          </div>

          {/* Password Input */}
          <div className="text-left relative">
            <div className="flex justify-between items-center mb-1.5 ml-1">
              <label className="block text-[10px] font-mono tracking-widest text-gray-400 uppercase">
                Access Passcode
              </label>
              <button
                type="button"
                onClick={() => onNavigate('forgot')}
                className="text-[10px] font-mono tracking-wider text-cyan-400/60 hover:text-cyan-400 transition-colors bg-transparent border-none p-0 cursor-pointer"
              >
                Passcode Lost?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full bg-[#0a0a23]/60 border border-cyan-500/10 focus:border-cyan-400/60 rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-400/40 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-500/60 hover:text-cyan-400 text-xs font-mono cursor-pointer"
              >
                {showPassword ? 'HIDE' : 'SHOW'}
              </button>
            </div>
          </div>

          {/* Remember me & submit controls */}
          <div className="flex items-center justify-between text-xs font-mono text-gray-400 pt-1">
            <label className="flex items-center space-x-2 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-3.5 h-3.5 bg-black border border-cyan-500/30 rounded focus:ring-0 accent-cyan-400 cursor-pointer"
              />
              <span>Remember Unit</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-xl font-mono text-xs uppercase tracking-widest font-black text-black bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.3)] disabled:opacity-40 transition-all duration-300 border border-cyan-400 cursor-pointer flex justify-center items-center"
          >
            {loading ? (
              <span className="flex items-center space-x-2">
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Syncing Neural Node...</span>
              </span>
            ) : (
              'SYNC ACCESS'
            )}
          </button>
        </form>

        {/* Redirect bottom link */}
        <div className="mt-8 pt-6 border-t border-white/5 text-center text-xs font-mono text-gray-400">
          <span>Fresh learner unit? </span>
          <button
            onClick={() => onNavigate('signup')}
            className="text-cyan-400 hover:underline font-bold bg-transparent border-none p-0 cursor-pointer"
          >
            Initialize Core Profile
          </button>
        </div>
      </div>
    </div>
  );
};
