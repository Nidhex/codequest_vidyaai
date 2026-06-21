import React, { useState } from 'react';
import { useMainStore } from '../store/mainStore';
import { ArrowLeft, User, BookOpen, Globe, Award, Flame, Star, Save, Shield } from 'lucide-react';

interface StudentProfilePageProps {
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

export const StudentProfilePage: React.FC<StudentProfilePageProps> = ({ onNavigate }) => {
  const { user, token, setUser, setLanguage, setClassLevel } = useMainStore();
  
  const [name, setName] = useState(user?.name || '');
  const [classLevel, setClassLevelInput] = useState(user ? parseInt((user as any).class || user.level) || 8 : 8);
  const [preferredLanguage, setLanguageInput] = useState(user?.preferredLanguage || 'en');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!user) {
    return (
      <div className="w-full text-center py-20 font-mono text-cyan-400">
        No active profile logged in. Redirecting...
      </div>
    );
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await fetch('http://localhost:5000/api/auth/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, classLevel, preferredLanguage })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to sync cognitive profile changes.');
      }

      setUser(data.user);
      setLanguage(data.user.preferredLanguage);
      setClassLevel(parseInt(data.user.class) || 8);
      setSuccessMsg('Profile calibrated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Calibration link failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-left">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => onNavigate('dashboard')}
            className="p-2.5 rounded-xl border border-cyan-500/20 bg-cyan-950/20 text-cyan-400 hover:text-white hover:border-cyan-400 transition-all cursor-pointer shadow-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-extrabold font-outfit text-white tracking-wider flex items-center gap-2">
              COGNITIVE PROFILE <Shield className="w-6 h-6 text-cyan-400" />
            </h1>
            <p className="font-mono text-xs text-cyan-400/80 uppercase mt-1">
              Neural Calibration & Achievement Ledger
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Avatar & Meta Showcase */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-cyan-500/20 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-bl-full pointer-events-none" />
            
            {/* Rank Avatar */}
            <div className="w-24 h-24 rounded-2xl bg-cyan-950/60 border border-cyan-400/30 flex items-center justify-center text-4xl mb-4 shadow-[0_0_20px_rgba(6,182,212,0.15)] relative">
              <User className="w-12 h-12 text-cyan-400" />
              <div className="absolute -bottom-2 -right-2 bg-purple-600 text-white text-[10px] font-black font-mono px-2 py-0.5 rounded border border-purple-400">
                LVL {user.level || 1}
              </div>
            </div>

            <h2 className="text-xl font-bold font-outfit text-white">{user.name}</h2>
            <p className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase mt-1">
              {user.role} Account Node
            </p>
            <p className="text-xs text-gray-400 mt-2 font-mono break-all w-full">
              {(user as any).email}
            </p>

            {/* Micro Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 w-full mt-6 pt-6 border-t border-white/5 font-mono">
              <div className="p-3 rounded-2xl bg-[#0a0a23]/60 border border-cyan-500/10 flex flex-col items-center">
                <Flame className="w-5 h-5 text-amber-500 animate-pulse" />
                <span className="text-lg font-black text-white mt-1">{user.streak || 0}</span>
                <span className="text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">Streak</span>
              </div>
              
              <div className="p-3 rounded-2xl bg-[#0a0a23]/60 border border-cyan-500/10 flex flex-col items-center">
                <Star className="w-5 h-5 text-purple-400" />
                <span className="text-lg font-black text-white mt-1">{user.xp || 0}</span>
                <span className="text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">XP Pool</span>
              </div>
            </div>
          </div>

          {/* Badges showcase shelf */}
          <div className="glass-panel p-6 rounded-3xl border border-cyan-500/20">
            <h3 className="text-sm font-bold font-outfit text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-400" /> Badges Showcase
            </h3>
            
            {user.badges && user.badges.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {user.badges.map((badge, idx) => (
                  <div 
                    key={idx}
                    className="p-3 rounded-2xl bg-purple-950/10 border border-purple-500/20 flex flex-col items-center text-center hover:border-purple-400 transition-all duration-300 group shadow-md"
                  >
                    <span className="text-2xl group-hover:scale-110 transition-transform mb-1.5">
                      {badge.includes('Language') ? '🌐' : badge.includes('Feynman') ? '🧠' : badge.includes('Debate') ? '🤺' : '🏆'}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-purple-400 leading-tight">
                      {badge}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl border border-dashed border-white/10 text-center text-xs text-gray-500 font-mono">
                No achievements unlocked yet. Continue studying to earn badges!
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Settings Calibration Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 md:p-8 rounded-3xl border border-cyan-500/20 relative">
            <h3 className="text-xl font-bold font-outfit text-white uppercase tracking-wider mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-cyan-400" /> CALIBRATE NEURAL PREFERENCES
            </h3>

            {/* Notifications */}
            {successMsg && (
              <div className="mb-6 p-4 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 rounded-2xl font-mono text-xs flex items-center space-x-2 animate-fade-in">
                <span>✓</span>
                <p>{successMsg}</p>
              </div>
            )}

            {errorMsg && (
              <div className="mb-6 p-4 bg-red-950/40 border border-red-500/30 text-red-400 rounded-2xl font-mono text-xs flex items-center space-x-2 animate-shake">
                <span>⚠️</span>
                <p>{errorMsg}</p>
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-6">
              
              {/* Name */}
              <div className="text-left">
                <label className="block text-[10px] font-mono tracking-widest text-gray-400 uppercase mb-2 ml-1">
                  Full Name Label
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full bg-[#0a0a23]/60 border border-cyan-500/10 focus:border-cyan-400/60 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-400/40 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Grid Class & Language */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="text-left">
                  <label className="block text-[10px] font-mono tracking-widest text-gray-400 uppercase mb-2 ml-1 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-cyan-400" /> NCERT Syllabus Grade
                  </label>
                  <select
                    value={classLevel}
                    onChange={(e) => setClassLevelInput(parseInt(e.target.value))}
                    disabled={loading}
                    className="w-full bg-[#0a0a23] border border-cyan-500/15 focus:border-cyan-400 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-400/40 font-mono transition-all"
                  >
                    <option value={3}>Class 3 (Primary)</option>
                    <option value={5}>Class 5 (Elementary)</option>
                    <option value={8}>Class 8 (Middle School)</option>
                    <option value={12}>Class 12 (High School)</option>
                  </select>
                </div>

                <div className="text-left">
                  <label className="block text-[10px] font-mono tracking-widest text-gray-400 uppercase mb-2 ml-1 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-cyan-400" /> Primary Study Medium
                  </label>
                  <select
                    value={preferredLanguage}
                    onChange={(e) => setLanguageInput(e.target.value)}
                    disabled={loading}
                    className="w-full bg-[#0a0a23] border border-cyan-500/15 focus:border-cyan-400 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-400/40 font-mono transition-all"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Save trigger button */}
              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full md:w-auto py-3 px-8 rounded-xl font-mono text-xs uppercase tracking-widest font-black text-black bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.3)] disabled:opacity-40 transition-all duration-300 border border-cyan-400 cursor-pointer flex justify-center items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'CALIBRATING...' : 'SAVE CALIBRATION'}
                </button>
              </div>

            </form>
          </div>
        </div>

      </div>
    </div>
  );
};
