import React from 'react';

interface WelcomePageProps {
  onNavigate: (page: string) => void;
}

export const WelcomePage: React.FC<WelcomePageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative p-6 bg-[#03001e] overflow-hidden selection:bg-cyan-500 selection:text-black">
      {/* Dynamic Cyberpunk background grids */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#1f1a3a_1px,transparent_1px),linear-gradient(to_bottom,#1f1a3a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />
      
      {/* Light highlights */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Glassmorphic Welcome Card */}
      <div className="z-10 w-full max-w-2xl text-center glass-panel p-8 md:p-12 rounded-3xl border border-cyan-500/20 shadow-[0_0_50px_rgba(0,242,254,0.05)] relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400" />

        {/* Brand Header */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center p-3.5 bg-cyan-950/40 rounded-2xl border border-cyan-400/30 mb-5 shadow-[0_0_20px_rgba(6,182,212,0.15)] animate-pulse">
            <span className="text-4xl text-cyan-400 font-extrabold select-none">वि</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-extrabold font-outfit tracking-wider bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(0,242,254,0.1)]">
            VIDYA AI
          </h1>
          
          <p className="text-sm font-semibold text-cyan-400/80 tracking-[0.2em] font-mono mt-3 uppercase">
            Quality Education in Every Indian Language
          </p>
        </div>

        {/* App Intro Pitch */}
        <p className="text-gray-300 max-w-md mx-auto mb-10 leading-relaxed font-sans text-sm md:text-base">
          Embark on a personalized cognitive learning journey. Vidya AI combines advanced generative models, Socratic tutoring, and structured NCERT curricula in 22 regional Indian languages.
        </p>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-md mx-auto">
          <button
            onClick={() => onNavigate('login')}
            className="w-full sm:w-1/2 py-3.5 px-6 rounded-xl font-mono text-xs uppercase tracking-widest font-black text-black bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] transition-all duration-300 border border-cyan-400 cursor-pointer"
          >
            Access Sanctum
          </button>
          
          <button
            onClick={() => onNavigate('signup')}
            className="w-full sm:w-1/2 py-3.5 px-6 rounded-xl font-mono text-xs uppercase tracking-widest font-black text-cyan-400 hover:text-white bg-cyan-950/20 hover:bg-cyan-900/30 border border-cyan-500/30 hover:border-cyan-400 shadow-lg active:bg-cyan-900/60 transition-all duration-300 cursor-pointer"
          >
            Create Profile
          </button>
        </div>

        {/* Footer info line */}
        <div className="mt-12 pt-6 border-t border-white/5 flex justify-between items-center text-[10px] text-gray-500 font-mono">
          <span>v2.0.26 // SYSTEM SECURE</span>
          <span className="text-cyan-400/60 font-bold uppercase tracking-wider">NCERT Co-Pilot Enabled</span>
        </div>
      </div>
    </div>
  );
};
