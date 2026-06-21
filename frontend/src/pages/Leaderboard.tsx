import React from 'react';
import { useMainStore } from '../store/mainStore';
import { Trophy, Award, Sparkles, Medal, Star } from 'lucide-react';

export const Leaderboard: React.FC = () => {
  const { user } = useMainStore();

  const mockLeaderboard = [
    { rank: 1, name: user?.name || "You", xp: user?.xp || 0, level: user?.level || 1, active: true },
    { rank: 2, name: "Divya Sen", xp: 1120, level: 3, active: false },
    { rank: 3, name: "Rahul Gupta", xp: 950, level: 3, active: false },
    { rank: 4, name: "Priya Das", xp: 890, level: 3, active: false },
    { rank: 5, name: "Rohan Malhotra", xp: 750, level: 2, active: false }
  ];

  const badgesCatalog = [
    { title: "Language Pioneer", icon: "🎖️", desc: "Change context to study in a regional Indian language.", unlocked: true },
    { title: "Feynman Scholar", icon: "🧠", desc: "Achieve over 85% understanding score in Feynman Mode.", unlocked: true },
    { title: "Debate Champion", icon: "💬", desc: "Complete an argument round in the multiplayer Debate Arena.", unlocked: true },
    { title: "Streak Master", icon: "🔥", desc: "Maintain a study streak for 5 consecutive days.", unlocked: true },
    { title: "Fast Speaker", icon: "⚡", desc: "Achieve perfect pronunciation match in Voice Classroom.", unlocked: false },
    { title: "Star Pupil", icon: "⭐", desc: "Gain 1500 total XP points across modules.", unlocked: false }
  ];

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col space-y-6">
      
      {/* HEADER */}
      <div className="flex justify-between items-center border-b border-cyber-border/20 pb-4">
        <div className="text-left font-mono">
          <span className="text-[10px] text-cyber-purple font-bold tracking-widest uppercase">Gamification Center</span>
          <h1 className="font-outfit font-black text-2xl text-white mt-1">
            Leaderboard & Achievements
          </h1>
        </div>
      </div>

      {/* TWO COLUMN GRID */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: HIGH SCORE STUDENT BOARD */}
        <div className="lg:col-span-6 glass-panel p-5 rounded-2xl border border-cyber-border/40 shadow-glass flex flex-col space-y-4 text-left font-mono text-xs">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyber-cyan flex items-center gap-1.5 border-b border-cyber-border/20 pb-2">
            <Trophy className="w-4 h-4 text-cyber-cyan" /> Regional Class Rankings
          </h3>

          <div className="space-y-2">
            {mockLeaderboard.map((student, idx) => (
              <div 
                key={idx}
                className={`flex items-center justify-between p-3 rounded-xl border ${
                  student.active 
                    ? 'bg-cyber-blue/15 border-cyber-blue text-white font-bold shadow-glow-blue' 
                    : 'bg-black/30 border-cyber-border/10 text-cyber-text/80'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded-lg bg-cyber-bg/60 border border-cyber-border flex items-center justify-center font-bold text-cyber-cyan text-[10px]">
                    #{student.rank}
                  </div>
                  <span>{student.name}</span>
                </div>
                
                <div className="flex items-center space-x-4">
                  <span className="text-[10px] text-cyber-text/50">Lvl {student.level}</span>
                  <span className="text-cyber-purple font-bold">{student.xp} XP</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: MERIT BADGES SHOWCASE */}
        <div className="lg:col-span-6 glass-panel p-5 rounded-2xl border border-cyber-border/40 shadow-glass flex flex-col space-y-4 text-left font-mono text-xs">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyber-pink flex items-center gap-1.5 border-b border-cyber-border/20 pb-2">
            <Award className="w-4 h-4 text-cyber-pink animate-pulse" /> Merit Badges Shelf
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {badgesCatalog.map((badge, idx) => (
              <div 
                key={idx}
                className={`p-3.5 rounded-xl border flex flex-col justify-between h-[110px] transition-colors ${
                  badge.unlocked 
                    ? 'bg-cyber-bg/40 border-cyber-border/30 hover:border-cyber-cyan/50 text-white' 
                    : 'bg-black/60 border-cyber-border/10 opacity-55 text-cyber-text/50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-xl">{badge.icon}</span>
                  {badge.unlocked && <Sparkles className="w-3.5 h-3.5 text-cyber-cyan" />}
                </div>
                
                <div>
                  <h4 className="font-bold text-[10px] truncate">{badge.title}</h4>
                  <p className="text-[8px] leading-tight text-cyber-text/60 mt-1 line-clamp-2">
                    {badge.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

    </div>
  );
};
