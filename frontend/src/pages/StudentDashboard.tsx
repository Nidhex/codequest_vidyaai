import React from 'react';
import { useMainStore } from '../store/mainStore';
import { TRANSLATIONS } from '../store/translations';
import { EngagementTracker } from '../components/EngagementTracker';
import { 
  Award, Flame, BarChart2, Eye, Compass, Clock 
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user, language, classLevel, engagement } = useMainStore();
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  if (!user) return null;

  const levelProgress = ((user.xp % 400) / 400) * 100;

  // Render SVG attention graph
  const renderAttentionGraph = () => {
    const history = engagement.attentionHistory || [80, 85, 90, 80, 85, 90];
    const width = 280;
    const height = 50;
    const padding = 5;
    const pointsCount = history.length;
    const xStep = (width - padding * 2) / (pointsCount - 1 || 1);
    
    const points = history.map((val, i) => {
      const x = padding + i * xStep;
      const y = height - padding - (val / 100) * (height - padding * 2);
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width="100%" height={height} className="overflow-visible mt-2">
        <polyline
          fill="none"
          stroke="#00f2fe"
          strokeWidth="2.5"
          points={points}
        />
        {history.map((val, i) => {
          const x = padding + i * xStep;
          const y = height - padding - (val / 100) * (height - padding * 2);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="3.5"
              fill={i === pointsCount - 1 ? "#9b5de5" : "#00f2fe"}
              className={i === pointsCount - 1 ? "animate-pulse" : ""}
            />
          );
        })}
      </svg>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col space-y-6">
      
      {/* 🚀 STUDENT DASHBOARD HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-cyber-border/20 pb-4">
        <div className="text-left font-mono">
          <span className="text-[10px] text-cyber-blue font-bold tracking-widest uppercase">Student Operations Center</span>
          <h1 className="font-outfit font-black text-2xl text-white mt-1">
            {t.welcomeBack}
          </h1>
        </div>
        <div className="text-right text-[10px] font-mono text-cyber-text/50 uppercase mt-2 sm:mt-0">
          <span>Active Grade: Class {classLevel} • Context: {language.toUpperCase()}</span>
        </div>
      </div>

      {/* 🌟 STATS CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Streak */}
        <div className="glass-panel p-4 rounded-xl border border-cyber-border/40 flex items-center space-x-4">
          <div className="p-3 bg-cyber-pink/15 rounded-lg text-cyber-pink">
            <Flame className="w-5.5 h-5.5 animate-bounce" />
          </div>
          <div className="text-left font-mono">
            <span className="text-[9px] text-cyber-text/50 uppercase">Current Streak</span>
            <div className="text-lg font-bold text-white mt-0.5">{user.streak} Days</div>
          </div>
        </div>

        {/* Level */}
        <div className="glass-panel p-4 rounded-xl border border-cyber-border/40 flex items-center space-x-4">
          <div className="p-3 bg-cyber-purple/15 rounded-lg text-cyber-purple">
            <Award className="w-5.5 h-5.5" />
          </div>
          <div className="text-left font-mono">
            <span className="text-[9px] text-cyber-text/50 uppercase">Current Level</span>
            <div className="text-lg font-bold text-white mt-0.5">Level {user.level}</div>
          </div>
        </div>

        {/* XP Points */}
        <div className="glass-panel p-4 rounded-xl border border-cyber-border/40 flex flex-col justify-between col-span-1 sm:col-span-2">
          <div className="flex justify-between items-center text-[9px] font-mono mb-1">
            <span className="text-cyber-text/50 uppercase">Comprehension XP</span>
            <span className="text-cyber-cyan font-bold">{user.xp} / {user.level * 400} XP</span>
          </div>
          <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden border border-cyber-border/10">
            <div 
              className="h-full bg-gradient-to-r from-cyber-blue to-cyber-purple shadow-glow-blue transition-all duration-500" 
              style={{ width: `${levelProgress}%` }}
            ></div>
          </div>
        </div>

      </section>

      {/* 🚀 LAYOUT CONTAINER */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: CURRICULUM & BADGES */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          
          {/* Badge shelf */}
          <div className="glass-panel p-5 rounded-2xl border border-cyber-border/40 flex flex-col space-y-4 shadow-glass">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyber-cyan flex items-center gap-1.5 border-b border-cyber-border/20 pb-2">
              <Award className="w-4 h-4" /> Earned Badges
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {user.badges.slice(0, 3).map((badge, idx) => (
                <div 
                  key={idx} 
                  className="flex flex-col items-center text-center p-2 rounded-xl bg-cyber-bg/40 border border-cyber-border/25 hover:border-cyber-cyan/50 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyber-blue/20 to-cyber-purple/20 border border-cyber-blue/30 flex items-center justify-center mb-1 text-cyber-cyan shadow-glow-cyan text-xs">
                    🎖️
                  </div>
                  <span className="text-[9px] font-mono leading-tight text-cyber-text/90">{badge}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Subject Progress */}
          <div className="glass-panel p-5 rounded-2xl border border-cyber-border/40 flex flex-col space-y-4 shadow-glass">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyber-purple flex items-center gap-1.5 border-b border-cyber-border/20 pb-2">
              <Compass className="w-4 h-4" /> Subject Completion
            </h3>
            <div className="space-y-3 font-mono text-xs">
              {Object.entries(user.subjectProgress).map(([subject, prog], idx) => (
                <div key={idx} className="flex flex-col space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-cyber-text/80">{subject}</span>
                    <span className="text-cyber-cyan font-bold">{prog}%</span>
                  </div>
                  <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-cyber-purple transition-all duration-300" 
                      style={{ width: `${prog}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: ATTENTION TELEMETRY */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Camera Gaze Tracking Widget */}
          <div className="md:col-span-5">
            <EngagementTracker />
          </div>

          {/* Graph timelines details */}
          <div className="md:col-span-7 glass-panel p-5 rounded-2xl border border-cyber-border/40 flex flex-col justify-between shadow-glass relative h-[255px]">
            <div className="absolute top-2 right-2 bg-cyber-cyan/15 px-2 py-0.5 rounded text-[8px] font-mono text-cyber-cyan">
              LOCAL TELEMETRY
            </div>
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyber-blue flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4" /> Focus Timeline Chart
              </h3>
              <p className="text-[9px] text-cyber-text/60 font-mono mt-1 leading-relaxed">
                Tracks gaze fluctuations client-side. Alert warnings trigger automatically if eye aspect ratios indicate sleepiness.
              </p>
              {renderAttentionGraph()}
            </div>

            <div className="mt-4 pt-3 border-t border-cyber-border/20 grid grid-cols-3 gap-2 text-center text-[9px] font-mono">
              <div>
                <span className="text-cyber-text/50 uppercase">Gaze Direction</span>
                <div className="text-cyber-cyan font-bold mt-0.5">CENTERED</div>
              </div>
              <div>
                <span className="text-cyber-text/50 uppercase">Safe Duration</span>
                <div className="text-cyber-purple font-bold mt-0.5 flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3" /> 25 Mins
                </div>
              </div>
              <div>
                <span className="text-cyber-text/50 uppercase">System Status</span>
                <div className="text-green-400 font-bold mt-0.5">SECURE</div>
              </div>
            </div>
          </div>

        </div>

      </main>

    </div>
  );
};
