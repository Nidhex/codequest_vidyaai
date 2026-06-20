import React from 'react';
import { useMainStore } from '../store/mainStore';
import { ArrowLeft, BarChart2, Calendar, ShieldCheck, Clock, Award } from 'lucide-react';

interface AnalyticsPanelProps {
  onNavigate: (page: string) => void;
}

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ onNavigate }) => {
  const { user } = useMainStore();

  if (!user) return null;

  return (
    <div className="w-full min-h-screen max-w-7xl mx-auto px-6 py-6 flex flex-col space-y-6">
      
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-cyber-border/20 pb-4 font-mono text-xs">
        <button 
          onClick={() => onNavigate('dashboard')}
          className="flex items-center space-x-1.5 text-cyber-blue hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Panel</span>
        </button>

        <h2 className="font-outfit font-black text-lg tracking-wider text-cyber-cyan uppercase flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-cyber-cyan animate-pulse" />
          Learning Analytics & Focus Logs
        </h2>

        <div className="w-20"></div>
      </div>

      {/* VIEWS */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: DAILY STREAKS & STATS */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          
          <div className="glass-panel p-5 rounded-2xl border border-cyber-border/40 shadow-glass flex flex-col space-y-4 text-left font-mono text-xs">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyber-purple flex items-center gap-1.5 border-b border-cyber-border/20 pb-2">
              <Calendar className="w-4 h-4" /> Streak Tracker (Last 5 Days)
            </h3>
            
            <div className="grid grid-cols-5 gap-2 text-center">
              {user.streakLogs.map((active, idx) => (
                <div key={idx} className="bg-black/45 p-2 rounded-lg border border-cyber-border/20">
                  <div className="text-[8px] text-cyber-text/50">DAY {idx + 1}</div>
                  <div className={`text-base font-bold mt-1 ${active ? 'text-cyber-pink' : 'text-cyber-text/30'}`}>
                    {active ? "🔥" : "⚪"}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-cyber-text/60 leading-relaxed">
              Login daily, read lesson sheets, explain to the AI tutor, and solve quick quizzes to maintain your streak.
            </p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-cyber-border/40 shadow-glass flex flex-col space-y-4 text-left font-mono text-xs">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyber-cyan flex items-center gap-1.5 border-b border-cyber-border/20 pb-2">
              <Clock className="w-4 h-4" /> Focus Statistics
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-2.5 bg-black/40 rounded-xl border border-cyber-border/20">
                <span className="text-cyber-text/80">Average Daily Focus Time</span>
                <span className="font-bold text-white">42 mins</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-black/40 rounded-xl border border-cyber-border/20">
                <span className="text-cyber-text/80">Peak Focus Hour</span>
                <span className="font-bold text-white">10:00 AM</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-black/40 rounded-xl border border-cyber-border/20">
                <span className="text-cyber-text/80">Lessons completed</span>
                <span className="font-bold text-white">{user.completedLessons.length} units</span>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: GAUGE METRICS */}
        <div className="lg:col-span-8 glass-panel p-5 rounded-2xl border border-cyber-border/40 shadow-glass flex flex-col space-y-5 text-left font-mono text-xs">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyber-blue flex items-center gap-1.5 border-b border-cyber-border/20 pb-2">
            <Award className="w-4 h-4" /> Language & Regional Mastery
          </h3>
          
          <div className="space-y-4">
            {[
              { lang: "Hindi scripts vocabulary", value: 85, color: "bg-cyber-blue" },
              { lang: "English technical syntax", value: 92, color: "bg-cyber-purple" },
              { lang: "Regional cultural metaphors", value: 70, color: "bg-cyber-pink" },
              { lang: "Hinglish code-mixing translation", value: 80, color: "bg-cyber-cyan" }
            ].map((mastery, idx) => (
              <div key={idx} className="flex flex-col space-y-1">
                <div className="flex justify-between">
                  <span className="text-white font-bold">{mastery.lang}</span>
                  <span className="text-cyber-cyan">{mastery.value}%</span>
                </div>
                <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${mastery.color} transition-all duration-500`}
                    style={{ width: `${mastery.value}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-cyber-border/20 flex items-center gap-2 text-cyber-text/60 leading-relaxed text-[10px]">
            <ShieldCheck className="w-5 h-5 text-cyber-cyan flex-shrink-0" />
            <span>All historical logs are saved directly in local storage cache (`database.json` adaptors). Gaze tracking details are discarded once the active browser tab closes.</span>
          </div>
        </div>

      </main>

    </div>
  );
};
