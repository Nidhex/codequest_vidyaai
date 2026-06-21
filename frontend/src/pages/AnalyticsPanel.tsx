import React, { useState, useEffect } from 'react';
import { useMainStore } from '../store/mainStore';
import { useAnalyticsStore } from '../store/analyticsStore';
import { 
  ArrowLeft, BarChart2, Calendar, ShieldCheck, Clock, Award, 
  Trophy, AlertTriangle, Sparkles, TrendingUp, BookOpen, 
  User, Flame, CheckCircle, Target, ChevronRight, Activity,
  Lock, CheckCircle2, RefreshCw
} from 'lucide-react';

interface AnalyticsPanelProps {
  onNavigate: (page: string) => void;
}

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ onNavigate }) => {
  const { user } = useMainStore();
  const {
    subjectMastery,
    xp,
    level,
    streak,
    weakTopics,
    heatmapData,
    quizStats,
    focusStats,
    achievements,
    overallLearningScore,
    rankLabel,
    loading,
    loadStats
  } = useAnalyticsStore();

  const overallScore = overallLearningScore;

  useEffect(() => {
    if (user) {
      loadStats(user.id);
    }
  }, [user, loadStats]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="w-full min-h-[80vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-cyber-cyan border-t-transparent rounded-full animate-spin"></div>
        <p className="font-mono text-xs text-cyber-cyan animate-pulse uppercase">Assembling educational intelligence dashboard...</p>
      </div>
    );
  }

  // Fallback styling helpers
  const getSubjectColor = (subject: string): { text: string; bg: string; fill: string; stroke: string } => {
    const s = subject.toLowerCase();
    if (s.includes('sci')) return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', fill: 'bg-emerald-500', stroke: '#10b981' };
    if (s.includes('math')) return { text: 'text-cyan-400', bg: 'bg-cyan-500/10', fill: 'bg-cyan-500', stroke: '#06b6d4' };
    if (s.includes('eng')) return { text: 'text-purple-400', bg: 'bg-purple-500/10', fill: 'bg-purple-500', stroke: '#a855f7' };
    if (s.includes('hind')) return { text: 'text-pink-400', bg: 'bg-pink-500/10', fill: 'bg-pink-500', stroke: '#ec4899' };
    return { text: 'text-yellow-400', bg: 'bg-yellow-500/10', fill: 'bg-yellow-500', stroke: '#eab308' };
  };

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-slate-950/60 border-slate-800/40 text-cyber-text/20';
    if (count === 1) return 'bg-emerald-950/60 border-emerald-900/40 text-emerald-400 shadow-[inset_0_0_8px_rgba(16,185,129,0.15)]';
    if (count === 2) return 'bg-emerald-850/40 border-emerald-700/50 text-emerald-300 shadow-[inset_0_0_12px_rgba(16,185,129,0.25)]';
    return 'bg-emerald-500 border-emerald-400 text-slate-900 font-black shadow-[0_0_15px_rgba(16,185,129,0.4)] animate-pulse';
  };

  // Check if there is any study activity logged yet
  const totalHeatmapCount = heatmapData.reduce((acc, h) => acc + h.count, 0);
  const noActivity = totalHeatmapCount === 0;

  // ----------------------------------------------------
  // 📊 SVG PROGRESS RING VALUES
  // ----------------------------------------------------
  const ringRadius = 55;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = ringCircumference - (overallLearningScore / 100) * ringCircumference;

  // ----------------------------------------------------
  // 📊 SVG RADAR CHART
  // ----------------------------------------------------
  const radarKeys = ['Science', 'Mathematics', 'English', 'Hindi', 'Social Science'];
  const radarLabels = ['Science', 'Math', 'English', 'Hindi', 'Social Sci'];
  const numAxes = radarKeys.length;
  const radarRadius = 65;
  const cx = 100;
  const cy = 100;

  const radarPoints = radarKeys.map((key, i) => {
    const angle = (2 * Math.PI * i) / numAxes - Math.PI / 2;
    const value = subjectMastery[key] !== undefined ? subjectMastery[key] : 10;
    const x = cx + radarRadius * (value / 100) * Math.cos(angle);
    const y = cy + radarRadius * (value / 100) * Math.sin(angle);
    return `${x},${y}`;
  }).join(' ');

  const radarGrids = [0.25, 0.5, 0.75, 1.0].map((scale, gIdx) => {
    const gridPoints = radarKeys.map((_, i) => {
      const angle = (2 * Math.PI * i) / numAxes - Math.PI / 2;
      const x = cx + radarRadius * scale * Math.cos(angle);
      const y = cy + radarRadius * scale * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');
    return (
      <polygon 
        key={gIdx} 
        points={gridPoints} 
        fill="none" 
        stroke="rgba(0, 242, 254, 0.12)" 
        strokeWidth="1" 
      />
    );
  });

  const radarAxes = radarKeys.map((key, i) => {
    const angle = (2 * Math.PI * i) / numAxes - Math.PI / 2;
    const xLine = cx + radarRadius * Math.cos(angle);
    const yLine = cy + radarRadius * Math.sin(angle);
    const xLabel = cx + (radarRadius + 18) * Math.cos(angle);
    const yLabel = cy + (radarRadius + 10) * Math.sin(angle);
    
    return (
      <g key={i}>
        <line 
          x1={cx} 
          y1={cy} 
          x2={xLine} 
          y2={yLine} 
          stroke="rgba(255, 255, 255, 0.12)" 
          strokeWidth="1" 
        />
        <text
          x={xLabel}
          y={yLabel}
          textAnchor="middle"
          alignmentBaseline="middle"
          className="text-[8px] font-mono fill-cyber-text/80 font-bold"
        >
          {radarLabels[i]}
        </text>
      </g>
    );
  });

  // ----------------------------------------------------
  // 📊 SVG WEEKLY TRENDS LINE GRAPH
  // ----------------------------------------------------
  const trendWidth = 400;
  const trendHeight = 150;
  const paddingX = 40;
  const paddingY = 20;
  const chartWidth = trendWidth - paddingX * 2;
  const chartHeight = trendHeight - paddingY * 2;

  const rawHistory = quizStats.recentQuizHistory || [];
  const trendHistory = rawHistory.length > 0 
    ? [...rawHistory].reverse()
    : [];

  const trendPoints = trendHistory.map((item, i) => {
    const x = paddingX + (i / Math.max(1, trendHistory.length - 1)) * chartWidth;
    const y = trendHeight - paddingY - (item.score / 100) * chartHeight;
    return { x, y, score: item.score, date: item.date, topic: item.topic };
  });

  const linePath = trendPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="w-full min-h-screen max-w-7xl mx-auto px-4 py-4 flex flex-col space-y-6">
      
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-cyber-border/20 pb-4 font-mono text-xs">
        <button 
          onClick={() => onNavigate('dashboard')}
          className="flex items-center space-x-1.5 text-cyber-blue hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Analytics</span>
        </button>

        <h2 className="font-outfit font-black text-lg tracking-wider text-cyber-cyan uppercase flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-cyber-cyan animate-pulse" />
          Vidya AI Learning Intelligence Dashboard
        </h2>

        <div className="flex items-center gap-2">
          <button
            onClick={() => user && loadStats(user.id)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-black/45 hover:bg-black/60 rounded-lg border border-cyber-border/25 text-[10px] text-cyber-blue hover:text-cyan-300 transition-all cursor-pointer"
            title="Force refresh backend aggregations"
          >
            <RefreshCw className="w-3 h-3 animate-spin-slow" />
            <span>Sync</span>
          </button>
          <div className="flex items-center gap-1 bg-black/45 px-2.5 py-1 rounded-lg border border-cyber-border/25 text-[10px]">
            <User className="w-3.5 h-3.5 text-cyber-purple" />
            <span>Student: <strong className="text-white">{user.name}</strong></span>
          </div>
        </div>
      </div>

      {noActivity ? (
        /* NO ACTIVITY SKELETON / EMPTY STATE */
        <div className="glass-panel p-12 rounded-3xl border border-cyber-border/40 text-center flex flex-col items-center justify-center space-y-5 max-w-xl mx-auto my-12 shadow-glow-purple">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyber-purple/20 to-cyber-pink/20 border border-cyber-purple/40 flex items-center justify-center text-4xl shadow-glow-purple">
            📊
          </div>
          <div className="space-y-2">
            <h3 className="font-outfit font-black text-xl text-white">No Activity Logged Yet</h3>
            <p className="text-sm font-mono text-cyber-text/60 max-w-sm mx-auto leading-relaxed">
              Your telemetry logs are clean! Complete practice questions, Feynman mode reviews, or debate arena tournaments to activate your student analytics engine.
            </p>
          </div>
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyber-blue via-cyber-purple to-cyber-pink hover:opacity-90 text-white font-outfit font-black text-xs uppercase tracking-widest flex items-center gap-1.5 shadow-glow-blue cursor-pointer transition-all"
          >
            Start Learning Now <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* ACTIVE TELEMETRY DASHBOARD */
        <div className="flex flex-col space-y-6">
          
          {/* OVERVIEW STATS GRID */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Focus Hours */}
            <div className="glass-panel p-4 rounded-2xl border border-cyber-border/30 bg-gradient-to-br from-black/40 to-cyan-950/10 shadow-glass flex items-center justify-between text-left font-mono">
              <div className="space-y-1">
                <span className="text-[10px] text-cyber-text/50 uppercase tracking-wider block">Total Study Time</span>
                <span className="text-3xl font-black text-white">{Math.round(heatmapData.reduce((acc, h) => acc + h.minutes, 0))} <span className="text-xs font-normal text-cyber-text/60">mins</span></span>
                <span className="text-[9px] text-cyber-cyan block">~{Math.round((heatmapData.reduce((acc, h) => acc + h.minutes, 0) / 60) * 10) / 10} hours logged</span>
              </div>
              <div className="p-3 bg-cyber-blue/10 border border-cyber-blue/20 rounded-xl text-cyber-blue">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            {/* Total XP */}
            <div className="glass-panel p-4 rounded-2xl border border-cyber-border/30 bg-gradient-to-br from-black/40 to-purple-950/10 shadow-glass flex items-center justify-between text-left font-mono">
              <div className="space-y-1">
                <span className="text-[10px] text-cyber-text/50 uppercase tracking-wider block">Total XP</span>
                <span className="text-3xl font-black text-white">{xp} <span className="text-xs font-normal text-cyber-text/60">XP</span></span>
                <span className="text-[9px] text-cyber-purple block">Level {level} Scholar</span>
              </div>
              <div className="p-3 bg-cyber-purple/10 border border-cyber-purple/20 rounded-xl text-cyber-purple">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>

            {/* Weekly Streak */}
            <div className="glass-panel p-4 rounded-2xl border border-cyber-border/30 bg-gradient-to-br from-black/40 to-pink-950/10 shadow-glass flex items-center justify-between text-left font-mono">
              <div className="space-y-1">
                <span className="text-[10px] text-cyber-text/50 uppercase tracking-wider block">Active Streak</span>
                <span className="text-3xl font-black text-white">{streak} <span className="text-xs font-normal text-cyber-text/60">days</span></span>
                <span className="text-[9px] text-cyber-pink block">Consistent learning streak</span>
              </div>
              <div className="p-3 bg-cyber-pink/10 border border-cyber-pink/20 rounded-xl text-cyber-pink animate-bounce">
                <Flame className="w-5 h-5 fill-cyber-pink" />
              </div>
            </div>

            {/* Rank Label / Badges */}
            <div className="glass-panel p-4 rounded-2xl border border-cyber-border/30 bg-gradient-to-br from-black/40 to-amber-950/10 shadow-glass flex items-center justify-between text-left font-mono">
              <div className="space-y-1">
                <span className="text-[10px] text-cyber-text/50 uppercase tracking-wider block">Rank Classification</span>
                <span className="text-md font-bold text-white block mt-1 truncate max-w-[150px]">{rankLabel}</span>
                <span className="text-[9px] text-cyber-yellow block">Based on Level {level} achievements</span>
              </div>
              <div className="p-3 bg-cyber-yellow/10 border border-cyber-yellow/20 rounded-xl text-cyber-yellow">
                <Trophy className="w-5 h-5 fill-cyber-yellow" />
              </div>
            </div>

          </div>

          {/* DETAILED DIAGNOSTIC SECTION */}
          <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN: OVERALL CORE SCORE + SUBJECTS + HEATMAP */}
            <div className="lg:col-span-6 flex flex-col space-y-6">
              
              {/* Circular Learning Progress Ring Card */}
              <div className="glass-panel p-5 rounded-2xl border border-cyber-border/40 shadow-glass flex flex-col md:flex-row items-center gap-6 text-left font-mono">
                
                {/* SVG Progress Ring */}
                <div className="relative flex items-center justify-center shrink-0">
                  <svg className="w-36 h-36 transform -rotate-90">
                    <defs>
                      <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#00f2fe" />
                        <stop offset="100%" stopColor="#9b5de5" />
                      </linearGradient>
                      <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    <circle cx="72" cy="72" r={ringRadius} fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                    <circle
                      cx="72"
                      cy="72"
                      r={ringRadius}
                      fill="transparent"
                      stroke="url(#ringGrad)"
                      strokeWidth="8"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                      style={{ filter: 'url(#neonGlow)' }}
                    />
                  </svg>
                  {/* Inside Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-black text-white">{overallScore}%</span>
                    <span className="text-[8px] text-cyber-text/50 uppercase tracking-widest">Global Score</span>
                  </div>
                </div>

                <div className="space-y-3 flex-1">
                  <h3 className="font-outfit font-extrabold text-lg text-white">Overall Learning Score</h3>
                  <p className="text-[10px] text-cyber-text/60 leading-relaxed font-sans">
                    Computed using quiz accuracy index (40%), daily streak consistency (20%), lesson viewers completed (20%), debate logic score (10%), and Socratic Feynman modes (10%).
                  </p>
                  
                  {/* Rank badge description */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyber-purple/10 border border-cyber-purple/30 rounded-full">
                    <span className="text-xs">🏆</span>
                    <span className="text-[10px] text-cyber-purple font-bold uppercase">{rankLabel}</span>
                  </div>
                </div>

              </div>

              {/* Subject Mastery Panel */}
              <div className="glass-panel p-5 rounded-2xl border border-cyber-border/40 shadow-glass flex flex-col space-y-4 text-left font-mono">
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyber-blue flex items-center gap-1.5 border-b border-cyber-border/20 pb-2.5">
                  <Award className="w-4.5 h-4.5 text-cyber-blue" /> Subject-wise Curriculum Mastery
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  {/* Progress bars list */}
                  <div className="space-y-3 flex-1">
                    {Object.entries(subjectMastery).map(([subj, val]) => {
                      const colors = getSubjectColor(subj);
                      return (
                        <div key={subj} className="flex flex-col space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-white font-bold">{subj}</span>
                            <span className={`${colors.text} font-bold`}>{val}% Mastery</span>
                          </div>
                          <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-cyber-border/10">
                            <div 
                              className={`h-full ${colors.fill} rounded-full transition-all duration-700`}
                              style={{ width: `${val}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* SVG Radar Chart Side-by-Side */}
                  <div className="flex flex-col items-center justify-center p-2 bg-black/35 rounded-xl border border-cyber-border/10 shrink-0">
                    <span className="text-[8px] text-cyber-text/50 uppercase block mb-2 text-center">Mastery Spectrum</span>
                    <div className="relative w-[200px] h-[200px]">
                      <svg viewBox="0 0 200 200" className="w-full h-full">
                        {radarGrids}
                        {radarAxes}
                        <polygon 
                          points={radarPoints} 
                          fill="rgba(155, 93, 229, 0.2)" 
                          stroke="#9b5de5" 
                          strokeWidth="1.5" 
                          className="transition-all duration-500"
                        />
                        {radarKeys.map((key, i) => {
                          const angle = (2 * Math.PI * i) / numAxes - Math.PI / 2;
                          const value = subjectMastery[key] !== undefined ? subjectMastery[key] : 10;
                          const x = cx + radarRadius * (value / 100) * Math.cos(angle);
                          const y = cy + radarRadius * (value / 100) * Math.sin(angle);
                          return (
                            <circle 
                              key={i} 
                              cx={x} 
                              cy={y} 
                              r="3.5" 
                              className="fill-cyber-cyan stroke-white stroke-[0.5px] transition-all duration-500" 
                            />
                          );
                        })}
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* GitHub Style Learning Heatmap with Interactive Tooltips */}
              <div className="glass-panel p-5 rounded-2xl border border-cyber-border/40 shadow-glass flex flex-col space-y-4 text-left font-mono">
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyber-cyan flex items-center gap-1.5 border-b border-cyber-border/20 pb-2.5">
                  <Calendar className="w-4.5 h-4.5 text-cyber-cyan" /> 28-Day Study Activity Matrix
                </h3>
                
                <div className="flex flex-col md:flex-row items-center gap-6 justify-center">
                  
                  {/* Dynamic Grid */}
                  <div className="grid grid-cols-7 gap-2.5 p-3.5 bg-black/35 rounded-xl border border-cyber-border/15 max-w-sm">
                    {heatmapData.map((day, idx) => {
                      const d = new Date(day.date);
                      const formattedDate = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                      return (
                        <div 
                          key={idx} 
                          className="relative group cursor-pointer"
                        >
                          <div 
                            className={`w-8 h-8 rounded-lg border flex items-center justify-center text-[10px] font-bold font-mono transition-all hover:scale-115 ${getHeatmapColor(day.count)}`}
                          >
                            {d.getDate()}
                          </div>
                          {/* Premium HTML CSS Tooltip */}
                          <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:flex flex-col space-y-1 w-40 p-2.5 bg-black/95 border border-cyber-border/40 text-[9px] font-mono rounded-lg shadow-2xl pointer-events-none text-left">
                            <span className="text-white font-bold border-b border-white/10 pb-0.5 mb-1">{formattedDate}</span>
                            <span className="text-cyber-cyan">Logs: {day.count} activities</span>
                            <span className="text-cyber-purple">Active: {day.minutes} mins</span>
                            <span className="text-cyber-yellow">Earned: +{day.xp} XP</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Legends */}
                  <div className="space-y-3 text-xs md:max-w-[200px] w-full">
                    <div className="p-2.5 bg-black/40 rounded-lg border border-cyber-border/10 space-y-2 text-[10px]">
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 bg-slate-950/60 border border-slate-800/40 rounded"></span>
                        <span>No Activity (0 logs)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 bg-emerald-950/70 border border-emerald-900/60 rounded"></span>
                        <span>Mild Progress (1 log)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 bg-emerald-850/40 border border-emerald-700/50 rounded"></span>
                        <span>Standard Focus (2 logs)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 bg-emerald-500 border border-emerald-400 rounded animate-pulse"></span>
                        <span>Peak Consistent (3+ logs)</span>
                      </div>
                    </div>
                    
                    <div className="text-[10px] text-cyber-text/50 text-center leading-relaxed">
                      Hover over any matrix element block to inspect details of that day's focus time.
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: WEAK TOPICS, WEEKLY LINE TRENDS, ATTENTION BAR, ACHIEVEMENTS */}
            <div className="lg:col-span-6 flex flex-col space-y-6">
              
              {/* Weak Topics and Practice Recommendations */}
              <div className="glass-panel p-5 rounded-2xl border border-cyber-border/40 shadow-glass flex flex-col space-y-4 text-left font-mono">
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyber-pink flex items-center gap-1.5 border-b border-cyber-border/20 pb-2.5">
                  <AlertTriangle className="w-4.5 h-4.5 text-cyber-pink" /> Weak Concepts Detected
                </h3>
                
                {weakTopics.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {weakTopics.map((wt, idx) => {
                      const color = getSubjectColor(wt.subject);
                      return (
                        <div key={idx} className="flex justify-between items-center p-3 bg-black/45 rounded-xl border border-cyber-border/25">
                          <div className="space-y-0.5">
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${color.text}`}>{wt.subject}</span>
                            <p className="text-white text-xs font-bold">{wt.topic}</p>
                            <p className="text-[9px] text-cyber-text/40">{wt.chapter}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-cyber-pink text-xs font-black block">{wt.score}% Accuracy</span>
                            <span className="text-[8px] text-cyber-text/50">Needs Review</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-950/10 border border-emerald-500/20 rounded-xl text-center flex flex-col items-center justify-center space-y-1">
                    <span className="text-xl">🏆</span>
                    <p className="text-xs text-green-400 font-bold uppercase tracking-wider">No Weak Concepts Detected!</p>
                    <p className="text-[9px] text-cyber-text/50 font-sans">You maintain high accuracy (&gt;70%) across all attempted concepts.</p>
                  </div>
                )}
              </div>

              {/* Weekly Trends Line Graph */}
              <div className="glass-panel p-5 rounded-2xl border border-cyber-border/40 shadow-glass flex flex-col space-y-4 text-left font-mono">
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyber-cyan flex items-center gap-1.5 border-b border-cyber-border/20 pb-2.5">
                  <TrendingUp className="w-4.5 h-4.5 text-cyber-cyan" /> Weekly Score Tendency Index
                </h3>
                
                <div className="flex flex-col items-center justify-center bg-black/35 p-3 rounded-xl border border-cyber-border/10">
                  <svg viewBox={`0 0 ${trendWidth} ${trendHeight}`} className="w-full h-auto">
                    {/* Y Grid lines */}
                    {[0, 25, 50, 75, 100].map((level, lIdx) => {
                      const y = trendHeight - paddingY - (level / 100) * chartHeight;
                      return (
                        <g key={lIdx}>
                          <line 
                            x1={paddingX} 
                            y1={y} 
                            x2={trendWidth - paddingX} 
                            y2={y} 
                            stroke="rgba(255, 255, 255, 0.05)" 
                            strokeWidth="1" 
                          />
                          <text 
                            x={paddingX - 10} 
                            y={y} 
                            alignmentBaseline="middle" 
                            textAnchor="end" 
                            className="text-[7px] font-mono fill-cyber-text/40"
                          >
                            {level}%
                          </text>
                        </g>
                      );
                    })}

                    {/* Area fill under the line */}
                    {trendPoints.length > 1 && (
                      <path 
                        d={`${linePath} L ${trendPoints[trendPoints.length - 1].x} ${trendHeight - paddingY} L ${trendPoints[0].x} ${trendHeight - paddingY} Z`}
                        fill="url(#trendAreaGrad)"
                        className="transition-all duration-700"
                      />
                    )}

                    {/* Gradient Definitions */}
                    <defs>
                      <linearGradient id="trendAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgba(0, 242, 254, 0.15)" />
                        <stop offset="100%" stopColor="rgba(0, 242, 254, 0.0)" />
                      </linearGradient>
                      <linearGradient id="trendLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#00f2fe" />
                        <stop offset="100%" stopColor="#a855f7" />
                      </linearGradient>
                    </defs>

                    {/* Main Line path */}
                    {trendPoints.length > 1 && (
                      <path 
                        d={linePath} 
                        fill="none" 
                        stroke="url(#trendLineGrad)" 
                        strokeWidth="2.5" 
                        strokeLinecap="round"
                        className="transition-all duration-700"
                      />
                    )}

                    {/* Data points (dots) */}
                    {trendPoints.map((p, pIdx) => (
                      <g key={pIdx} className="group/dot cursor-pointer">
                        <circle 
                          cx={p.x} 
                          cy={p.y} 
                          r="4" 
                          className="fill-cyber-bg stroke-cyber-cyan stroke-2 hover:r-5 transition-all"
                        />
                        <text
                          x={p.x}
                          y={p.y - 10}
                          textAnchor="middle"
                          className="text-[8px] font-mono font-bold fill-cyber-cyan hidden group-hover/dot:block bg-black"
                        >
                          {p.score}%
                        </text>
                        {/* X label */}
                        <text 
                          x={p.x} 
                          y={trendHeight - paddingY + 12} 
                          textAnchor="middle" 
                          className="text-[7px] font-mono fill-cyber-text/50"
                        >
                          {p.date}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>

              {/* Focus Logs Attention Bar Graph */}
              <div className="glass-panel p-5 rounded-2xl border border-cyber-border/40 shadow-glass flex flex-col space-y-4 text-left font-mono">
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyber-purple flex items-center gap-1.5 border-b border-cyber-border/20 pb-2.5">
                  <Activity className="w-4.5 h-4.5 text-cyber-purple" /> Focus Dynamics & Attention Graph
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center p-2.5 bg-black/40 rounded-xl border border-cyber-border/15">
                      <span className="text-[10px] text-cyber-text/70">Average Session Length</span>
                      <span className="font-bold text-white text-xs">{focusStats.avgSessionDuration} mins</span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 bg-black/40 rounded-xl border border-cyber-border/15">
                      <span className="text-[10px] text-cyber-text/70">Peak Productivity Hour</span>
                      <span className="font-bold text-white text-xs">{focusStats.peakFocusHour}</span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 bg-black/40 rounded-xl border border-cyber-border/15">
                      <span className="text-[10px] text-cyber-text/70">Historical Gaze Avg</span>
                      <span className="font-bold text-white text-xs">84% Attention</span>
                    </div>
                  </div>

                  {/* Dynamic Attention Bar Chart */}
                  <div className="flex flex-col justify-end bg-black/35 p-3 rounded-xl border border-cyber-border/15">
                    <span className="text-[9px] text-cyber-text/50 uppercase block mb-1 font-mono text-center">Gaze Attention Trend</span>
                    <div className="flex items-end justify-between h-20 gap-1.5 pt-2">
                      {focusStats.attentionHistory.map((score, idx) => (
                        <div key={idx} className="flex flex-col items-center flex-1 space-y-1">
                          <div 
                            className="w-full bg-gradient-to-t from-cyber-cyan to-cyan-400 rounded-t-md transition-all duration-700" 
                            style={{ height: `${score}%` }}
                            title={`Gaze Score: ${score}%`}
                          ></div>
                          <span className="text-[8px] text-cyber-text/30 font-sans">T-{7-idx}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Achievements Listing */}
              <div className="glass-panel p-5 rounded-2xl border border-cyber-border/40 shadow-glass flex flex-col space-y-4 text-left font-mono">
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyber-yellow flex items-center gap-1.5 border-b border-cyber-border/20 pb-2.5">
                  <Trophy className="w-4.5 h-4.5 text-cyber-yellow" /> Academic Achievements & Badges
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {achievements.map((ach) => (
                    <div 
                      key={ach.id} 
                      className={`p-3 rounded-xl border flex flex-col items-center justify-between text-center gap-2 transition-all ${
                        ach.unlocked 
                          ? 'border-cyber-yellow/40 bg-cyber-yellow/5 shadow-[inset_0_0_10px_rgba(234,179,8,0.1)]' 
                          : 'border-cyber-border/25 bg-black/30 opacity-40'
                      }`}
                    >
                      <div className="text-3xl shrink-0 filter drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]">
                        {ach.unlocked ? ach.icon : '🔒'}
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-black text-white block leading-snug">{ach.title}</span>
                        <p className="text-[8px] text-cyber-text/50 font-sans leading-tight mt-0.5">{ach.description}</p>
                      </div>
                      {ach.unlocked ? (
                        <span className="text-[7.5px] font-mono font-bold text-cyber-yellow uppercase border border-cyber-yellow/30 px-1 py-0.5 rounded-md bg-cyber-yellow/10">
                          Unlocked
                        </span>
                      ) : (
                        <span className="text-[7.5px] font-mono font-medium text-cyber-text/40 uppercase">
                          Locked
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </main>
          
          <div className="mt-4 pt-3 border-t border-cyber-border/25 flex items-center gap-2.5 text-cyber-text/45 font-mono text-[9px] leading-relaxed">
            <ShieldCheck className="w-4.5 h-4.5 text-cyber-cyan flex-shrink-0" />
            <span>Telemetry insights are calculated securely using localized state sync maps. All metrics are preserved in your database adapter profile.</span>
          </div>

        </div>
      )}

    </div>
  );
};
