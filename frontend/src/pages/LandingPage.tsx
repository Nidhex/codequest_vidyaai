import React from 'react';
import { useMainStore } from '../store/mainStore';
import { TRANSLATIONS } from '../store/translations';
import { AvatarTeacher } from '../components/AvatarTeacher';
import { Sparkles, Languages, Award, Shield, User, ArrowRight, Volume2 } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (page: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const { language, user } = useMainStore();
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const handleStart = () => {
    if (user) {
      onNavigate(user.role === 'teacher' ? 'teacher' : 'dashboard');
    } else {
      onNavigate('dashboard');
    }
  };

  const handleVoiceDemo = () => {
    onNavigate('voice');
  };

  return (
    <div className="w-full min-h-screen flex flex-col justify-between overflow-x-hidden relative">
      
      {/* 🚀 GLOWING HEADER */}
      <header className="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between z-30">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyber-blue to-cyber-purple flex items-center justify-center shadow-glow-blue">
            <Sparkles className="w-5.5 h-5.5 text-white animate-spin-slow" />
          </div>
          <span className="font-outfit font-extrabold text-2xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyber-blue to-cyber-pink">
            {t.appName}
          </span>
        </div>

        <button 
          onClick={handleStart}
          className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyber-purple to-cyber-blue text-black font-outfit font-black text-xs uppercase tracking-widest transition-all shadow-glow-blue cursor-pointer"
        >
          <User className="w-4 h-4" />
          <span>Launch Dashboard</span>
        </button>
      </header>

      {/* 🌟 HERO SECTION */}
      <main className="w-full max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center py-10 z-20">
        
        {/* Left Call to Actions */}
        <div className="lg:col-span-7 flex flex-col space-y-6 text-left">
          <div className="inline-flex items-center space-x-2 bg-cyber-blue/10 px-4 py-1.5 rounded-full border border-cyber-blue/30 w-fit">
            <Award className="w-3.5 h-3.5 text-cyber-blue animate-pulse" />
            <span className="text-[10px] font-mono tracking-widest uppercase text-cyber-blue">India's Multilingual AI Tutor</span>
          </div>

          <h1 className="font-outfit font-black text-4xl sm:text-5xl lg:text-6xl leading-tight">
            Quality Education in <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyber-blue via-cyber-purple to-cyber-pink animate-pulse-slow">
              Every Indian Language
            </span>
          </h1>

          <p className="text-sm sm:text-base text-cyber-text/80 leading-relaxed max-w-xl">
            Overcoming Bharat's language barriers. Vidya AI delivers curriculum-mapped (NCERT) tutoring, Socratic dialogue, and real-time focus analytics powered by 3D animated holographic teachers in 22 regional dialects.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <button
              onClick={handleStart}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyber-blue via-cyber-purple to-cyber-pink hover:opacity-95 text-black font-outfit font-black text-sm uppercase tracking-widest flex items-center justify-center space-x-2 transition-all shadow-glow-blue cursor-pointer"
            >
              <span>Start Learning</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleVoiceDemo}
              className="px-6 py-4 rounded-xl bg-cyber-card/60 hover:bg-cyber-card border border-cyber-border hover:border-cyber-cyan text-cyber-cyan font-mono font-bold text-xs uppercase tracking-widest flex items-center justify-center space-x-2 transition-all shadow-glass cursor-pointer"
            >
              <Volume2 className="w-4 h-4 animate-bounce" />
              <span>Try Voice Demo</span>
            </button>
          </div>
        </div>

        {/* Right Avatar Card */}
        <div className="lg:col-span-5 h-[360px] lg:h-[450px] flex items-center justify-center z-10">
          <div className="w-full max-w-sm h-full glass-panel rounded-3xl p-2.5 border border-cyber-border/50 shadow-glass relative flex flex-col justify-between">
            <div className="flex-1 rounded-2xl overflow-hidden bg-black/40">
              <AvatarTeacher isSpeaking={true} emotionState="encouraging" speechIntensity={0.55} />
            </div>
          </div>
        </div>

      </main>

      {/* 📋 MINIMAL FEATURE PREVIEW (ONLY 4 CARDS) */}
      <section className="w-full max-w-7xl mx-auto px-6 py-12 z-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1 */}
          <div className="glass-panel p-5 rounded-2xl border border-cyber-border/40 hover:scale-[1.02] transition-transform">
            <div className="w-8 h-8 rounded-lg bg-cyber-blue/15 flex items-center justify-center text-cyber-blue mb-4">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <h3 className="font-outfit font-bold text-sm text-white mb-2">1. AI Teacher Avatar</h3>
            <p className="text-[11px] text-cyber-text/70 leading-relaxed font-mono">
              3D holographic mesh face that deforms dynamically to sync with speech and emotions.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass-panel p-5 rounded-2xl border border-cyber-border/40 hover:scale-[1.02] transition-transform">
            <div className="w-8 h-8 rounded-lg bg-cyber-purple/15 flex items-center justify-center text-cyber-purple mb-4">
              <Languages className="w-4.5 h-4.5" />
            </div>
            <h3 className="font-outfit font-bold text-sm text-white mb-2">2. 22 Indian Languages</h3>
            <p className="text-[11px] text-cyber-text/70 leading-relaxed font-mono">
              Native script layouts, RTL Urdu, and code-mixed summaries mapping regional crops and stories.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass-panel p-5 rounded-2xl border border-cyber-border/40 hover:scale-[1.02] transition-transform">
            <div className="w-8 h-8 rounded-lg bg-cyber-pink/15 flex items-center justify-center text-cyber-pink mb-4">
              <Volume2 className="w-4.5 h-4.5" />
            </div>
            <h3 className="font-outfit font-bold text-sm text-white mb-2">3. Voice-first Learning</h3>
            <p className="text-[11px] text-cyber-text/70 leading-relaxed font-mono">
              Levenshtein pronunciation calculations and voice navigation commands for hands-free study.
            </p>
          </div>

          {/* Card 4 */}
          <div className="glass-panel p-5 rounded-2xl border border-cyber-border/40 hover:scale-[1.02] transition-transform">
            <div className="w-8 h-8 rounded-lg bg-cyber-cyan/15 flex items-center justify-center text-cyber-cyan mb-4">
              <Award className="w-4.5 h-4.5" />
            </div>
            <h3 className="font-outfit font-bold text-sm text-white mb-2">4. Gamification Streak</h3>
            <p className="text-[11px] text-cyber-text/70 leading-relaxed font-mono">
              Earn XP bonuses, unlock regional merit badges, and track class leaderboards.
            </p>
          </div>

        </div>
      </section>

      {/* 📊 MINIMAL IMPACT STATISTICS BAR */}
      <section className="w-full bg-cyber-card/20 backdrop-blur-md border-y border-cyber-border/20 py-6 z-20">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center font-mono">
          <div>
            <div className="text-xl sm:text-2xl font-extrabold text-cyber-blue font-outfit">22</div>
            <div className="text-[9px] text-cyber-text/50 uppercase mt-0.5">Indian Dialects</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold text-cyber-cyan font-outfit">196+</div>
            <div className="text-[9px] text-cyber-text/50 uppercase mt-0.5">NCERT Textbook Chapters</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold text-cyber-purple font-outfit">100%</div>
            <div className="text-[9px] text-cyber-text/50 uppercase mt-0.5">Local Camera Privacy</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold text-cyber-pink font-outfit">0ms</div>
            <div className="text-[9px] text-cyber-text/50 uppercase mt-0.5">Translation Lag</div>
          </div>
        </div>
      </section>

      {/* 🏢 FOOTER */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-5 border-t border-cyber-border/10 text-center text-[10px] text-cyber-text/45 font-mono z-20">
        &copy; {new Date().getFullYear()} VIDYA AI. Built with ❤️ for Bharat's Educational Future.
      </footer>
    </div>
  );
};
