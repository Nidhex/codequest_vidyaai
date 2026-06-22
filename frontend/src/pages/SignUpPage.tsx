import React, { useState } from 'react';
import { useMainStore } from '../store/mainStore';

interface SignUpPageProps {
  onNavigate: (page: string) => void;
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi (हिन्दी)' },
  { code: 'bn', name: 'Bengali (বাংলা)' },
  { code: 'te', name: 'Telugu (తెలుగు)' },
  { code: 'mr', name: 'Marathi (मराठी)' },
  { code: 'ta', name: 'Tamil (தமிழ்)' },
  { code: 'gu', name: 'Gujarati (ગુજરાતી)' },
  { code: 'kn', name: 'Kannada (ಕನ್ನಡ)' },
  { code: 'ml', name: 'Malayalam (മലയാളം)' },
  { code: 'pa', name: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'ur', name: 'Urdu (اردو)' }
];

export const SignUpPage: React.FC<SignUpPageProps> = ({ onNavigate }) => {
  const loginAction = useMainStore((state) => state.login);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [classLevel, setClassLevel] = useState(8);
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all mandatory fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          classLevel,
          preferredLanguage
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Initialization aborted. Server rejection.');
      }

      // Successful signup
      loginAction(data.token, data.user);
      
      // Redirect to appropriate dashboard
      if (data.user.role === 'teacher') {
        onNavigate('teacher');
      } else {
        onNavigate('dashboard');
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('⚡ Cannot reach server — backend may be offline. Please try again in a moment.');
      } else {
        setError(err.message || 'Signup failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative p-6 bg-[#03001e] overflow-hidden selection:bg-cyan-500 selection:text-black">
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#1f1a3a_1px,transparent_1px),linear-gradient(to_bottom,#1f1a3a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />
      
      <div className="z-10 w-full max-w-lg glass-panel p-8 md:p-10 rounded-3xl border border-cyan-500/20 shadow-2xl relative my-8">
        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyan-400" />
        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-cyan-400" />
        
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-extrabold font-outfit tracking-wide bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            INITIALIZE CORE PROFILE
          </h2>
          <p className="text-[10px] font-mono tracking-widest text-cyan-400/70 uppercase mt-2">
            Create Cognitive Telemetry Node
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-6 p-3 bg-red-950/40 border border-red-500/30 rounded-xl flex items-center space-x-3 text-red-400 font-mono text-xs animate-shake">
            <span>⚠️</span>
            <p className="flex-1 text-left leading-relaxed">{error}</p>
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Dual Column Input Name & Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-left">
              <label className="block text-[10px] font-mono tracking-widest text-gray-400 uppercase mb-1 ml-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Prathamesh Patil"
                disabled={loading}
                className="w-full bg-[#0a0a23]/60 border border-cyan-500/10 focus:border-cyan-400/60 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-400/40 transition-all font-mono"
              />
            </div>
            
            <div className="text-left">
              <label className="block text-[10px] font-mono tracking-widest text-gray-400 uppercase mb-1 ml-1">
                Cognitive Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. pratham@gmail.com"
                disabled={loading}
                className="w-full bg-[#0a0a23]/60 border border-cyan-500/10 focus:border-cyan-400/60 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-400/40 transition-all font-mono"
              />
            </div>
          </div>

          {/* Passcode input */}
          <div className="text-left">
            <label className="block text-[10px] font-mono tracking-widest text-gray-400 uppercase mb-1 ml-1">
              Create Passcode
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters recommended"
              disabled={loading}
              className="w-full bg-[#0a0a23]/60 border border-cyan-500/10 focus:border-cyan-400/60 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-400/40 transition-all font-mono"
            />
          </div>

          {/* Role selector */}
          <div className="text-left">
            <label className="block text-[10px] font-mono tracking-widest text-gray-400 uppercase mb-1.5 ml-1">
              Platform Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('student')}
                disabled={loading}
                className={`py-2 px-4 rounded-xl border text-xs font-mono tracking-wider transition-all duration-300 cursor-pointer ${
                  role === 'student'
                    ? 'border-cyan-400 bg-cyan-950/40 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                    : 'border-cyan-500/10 bg-[#0a0a23]/30 text-gray-400 hover:border-cyan-500/30'
                }`}
              >
                🎓 Student
              </button>
              
              <button
                type="button"
                onClick={() => setRole('teacher')}
                disabled={loading}
                className={`py-2 px-4 rounded-xl border text-xs font-mono tracking-wider transition-all duration-300 cursor-pointer ${
                  role === 'teacher'
                    ? 'border-purple-400 bg-purple-950/40 text-purple-400 shadow-[0_0_10px_rgba(147,51,234,0.15)]'
                    : 'border-cyan-500/10 bg-[#0a0a23]/30 text-gray-400 hover:border-purple-500/30'
                }`}
              >
                👩‍🏫 Teacher
              </button>
            </div>
          </div>

          {/* Class Level & Preferred Language */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-left">
              <label className="block text-[10px] font-mono tracking-widest text-gray-400 uppercase mb-1 ml-1">
                Class / Grade
              </label>
              <select
                value={classLevel}
                onChange={(e) => setClassLevel(parseInt(e.target.value))}
                disabled={loading}
                className="w-full bg-[#0a0a23] border border-cyan-500/15 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400/40 font-mono transition-all"
              >
                <option value={3}>Class 3 (Primary)</option>
                <option value={5}>Class 5 (Elementary)</option>
                <option value={8}>Class 8 (Middle School)</option>
                <option value={12}>Class 12 (High School)</option>
              </select>
            </div>

            <div className="text-left">
              <label className="block text-[10px] font-mono tracking-widest text-gray-400 uppercase mb-1 ml-1">
                Medium of Study
              </label>
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                disabled={loading}
                className="w-full bg-[#0a0a23] border border-cyan-500/15 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400/40 font-mono transition-all"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Submission button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3.5 px-6 rounded-xl font-mono text-xs uppercase tracking-widest font-black text-black bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.3)] disabled:opacity-40 transition-all duration-300 border border-cyan-400 cursor-pointer flex justify-center items-center"
          >
            {loading ? (
              <span className="flex items-center space-x-2">
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Initializing Node...</span>
              </span>
            ) : (
              'INITIALIZE COGNITIVE PROFILE'
            )}
          </button>
        </form>

        {/* Existing login link */}
        <div className="mt-6 pt-6 border-t border-white/5 text-center text-xs font-mono text-gray-400">
          <span>Already mapped to neural grid? </span>
          <button
            onClick={() => onNavigate('login')}
            className="text-cyan-400 hover:underline font-bold bg-transparent border-none p-0 cursor-pointer"
          >
            Sync Account
          </button>
        </div>
      </div>
    </div>
  );
};
