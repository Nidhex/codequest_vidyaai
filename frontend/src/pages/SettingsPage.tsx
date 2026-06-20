import React from 'react';
import { useMainStore } from '../store/mainStore';
import { TRANSLATIONS, LANGUAGES, REGIONS } from '../store/translations';
import { 
  Settings, Sliders, Glasses, Volume2, ShieldCheck, 
  User, CheckCircle, Info, Languages as LangIcon 
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const SettingsPage: React.FC = () => {
  const { 
    user, setUser, language, setLanguage, classLevel, setClassLevel, 
    region, setRegion, accessibility, toggleAccessibility 
  } = useMainStore();
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Simple visual reward
    confetti({
      particleCount: 50,
      spread: 50,
      colors: ['#00f2fe', '#00f5d4']
    });
  };

  if (!user) return null;

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col space-y-6">
      
      {/* HEADER */}
      <div className="flex justify-between items-center border-b border-cyber-border/20 pb-4">
        <div className="text-left font-mono">
          <span className="text-[10px] text-cyber-blue font-bold tracking-widest uppercase">System Settings</span>
          <h1 className="font-outfit font-black text-2xl text-white mt-1">
            {t.settings}
          </h1>
        </div>
      </div>

      {/* CONFIG GRID */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: PROFILE FORMS */}
        <div className="lg:col-span-6 glass-panel p-5 rounded-2xl border border-cyber-border/40 shadow-glass flex flex-col space-y-4 text-left font-mono text-xs">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyber-cyan flex items-center gap-1.5 border-b border-cyber-border/20 pb-2">
            <User className="w-4 h-4 text-cyber-cyan" /> Edit Student Profile
          </h3>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="flex flex-col space-y-1">
              <label className="text-cyber-text/60">Student Display Name</label>
              <input
                type="text"
                value={user.name}
                onChange={(e) => setUser({ ...user, name: e.target.value })}
                className="bg-black/40 border border-cyber-border/80 p-2.5 rounded-xl text-white focus:outline-none focus:border-cyber-blue"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col space-y-1">
                <label className="text-cyber-text/60">Class Grade Level</label>
                <select
                  value={classLevel}
                  onChange={(e) => setClassLevel(Number(e.target.value))}
                  className="bg-black/40 border border-cyber-border/80 p-2.5 rounded-xl text-white focus:outline-none focus:border-cyber-blue cursor-pointer"
                >
                  {[3, 8, 12].map(lvl => (
                    <option key={lvl} value={lvl}>Class {lvl}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-cyber-text/60">Context Region</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="bg-black/40 border border-cyber-border/80 p-2.5 rounded-xl text-white focus:outline-none focus:border-cyber-blue cursor-pointer"
                >
                  {REGIONS.map(reg => (
                    <option key={reg.code} value={reg.code}>{reg.name.split(' ')[0]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-cyber-text/60">Translation Dialect</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-black/40 border border-cyber-border/80 p-2.5 rounded-xl text-white focus:outline-none focus:border-cyber-blue cursor-pointer"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-cyber-blue hover:opacity-90 text-black font-outfit font-black uppercase tracking-wider rounded-xl text-xs shadow-glow-blue cursor-pointer"
            >
              Update Preferences
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: ACCESSIBILITY & SYSTEM DETAILS */}
        <div className="lg:col-span-6 flex flex-col space-y-6">
          
          {/* Accessibility card */}
          <div className="glass-panel p-5 rounded-2xl border border-cyber-border/40 shadow-glass flex flex-col space-y-4 text-left font-mono text-xs">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyber-pink flex items-center gap-1.5 border-b border-cyber-border/20 pb-2">
              <Sliders className="w-4 h-4 text-cyber-pink" /> Accessibility & Learning Adjusters
            </h3>

            <div className="flex flex-col space-y-2.5">
              <button 
                onClick={() => toggleAccessibility('dyslexiaMode')}
                className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  accessibility.dyslexiaMode 
                    ? 'bg-cyber-pink/20 border-cyber-pink text-white font-bold' 
                    : 'bg-black/45 border-cyber-border/50 text-cyber-text/70 hover:border-cyber-pink/50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Glasses className="w-4 h-4 text-cyber-pink animate-pulse" />
                  <span>Dyslexia-Friendly Text spacing</span>
                </div>
                <span className="text-[10px] font-bold">{accessibility.dyslexiaMode ? "ACTIVE" : "OFF"}</span>
              </button>

              <button 
                onClick={() => toggleAccessibility('highContrast')}
                className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  accessibility.highContrast 
                    ? 'bg-cyber-blue/20 border-cyber-blue text-white font-bold' 
                    : 'bg-black/45 border-cyber-border/50 text-cyber-text/70 hover:border-cyber-blue/50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-cyber-blue" />
                  <span>High Contrast Theme overlays</span>
                </div>
                <span className="text-[10px] font-bold">{accessibility.highContrast ? "ACTIVE" : "OFF"}</span>
              </button>

              <button 
                onClick={() => toggleAccessibility('textToSpeechEnabled')}
                className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  accessibility.textToSpeechEnabled 
                    ? 'bg-cyber-cyan/20 border-cyber-cyan text-white font-bold' 
                    : 'bg-black/45 border-cyber-border/50 text-cyber-text/70 hover:border-cyber-cyan/50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Volume2 className="w-4 h-4 text-cyber-cyan" />
                  <span>Voice Auto-Read (Text-To-Speech)</span>
                </div>
                <span className="text-[10px] font-bold">{accessibility.textToSpeechEnabled ? "ACTIVE" : "OFF"}</span>
              </button>
            </div>
          </div>

          {/* Core diagnostic info */}
          <div className="glass-panel p-4 rounded-xl border border-cyber-border/30 flex flex-col space-y-2 text-[10px] font-mono text-cyber-text/50">
            <span className="text-cyber-cyan font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> DIALECT & REGION CONTEXT
            </span>
            <p className="leading-relaxed">
              Updating these preferences automatically adjusts the vocabulary complexity and regional farming references generated by the Socratic AI teacher.
            </p>
          </div>

        </div>

      </main>

    </div>
  );
};
