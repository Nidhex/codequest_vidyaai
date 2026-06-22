import React, { useEffect, useRef, useState } from 'react';
import { useMainStore } from '../store/mainStore';
import { TRANSLATIONS } from '../store/translations';
import { EngagementTracker } from '../components/EngagementTracker';
import { 
  Award, Flame, BarChart2, Eye, Compass, Clock, Activity, Wifi
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user, language, classLevel, engagement } = useMainStore();
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  // Live session timer (in seconds, counting up)
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const sessionStartRef = useRef(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSeconds(Math.floor((Date.now() - sessionStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  if (!user || user.role !== 'student') return null;

  const levelProgress = ((user.xp % 400) / 400) * 100;

  // Live values from engagement store
  const currentScore = engagement.currentScore;
  const history = engagement.attentionHistory || [80];

  // Determine gaze direction label from score + state awareness
  const getGazeLabel = () => {
    if (currentScore >= 80) return { label: 'CENTERED', color: 'text-emerald-400' };
    if (currentScore >= 62) return { label: 'DRIFTING', color: 'text-amber-400' };
    if (currentScore >= 40) return { label: 'LOOKING AWAY', color: 'text-orange-400' };
    return { label: 'ABSENT', color: 'text-rose-400' };
  };

  const getSystemStatus = () => {
    if (currentScore >= 80) return { label: 'ENGAGED', color: 'text-emerald-400' };
    if (currentScore >= 62) return { label: 'PARTIAL', color: 'text-amber-400' };
    if (currentScore >= 40) return { label: 'DISTRACTED', color: 'text-orange-400' };
    return { label: 'DISENGAGED', color: 'text-rose-400' };
  };

  const gazeInfo = getGazeLabel();
  const statusInfo = getSystemStatus();

  // Render LIVE SVG attention graph with real-time data
  const renderAttentionGraph = () => {
    const width = 280;
    const height = 60;
    const padding = { x: 5, y: 5 };
    const pointsCount = Math.max(history.length, 2);
    const xStep = (width - padding.x * 2) / (pointsCount - 1);

    // Build polyline points
    const points = history.map((val, i) => {
      const x = padding.x + i * xStep;
      const y = height - padding.y - ((val / 100) * (height - padding.y * 2));
      return `${x},${y}`;
    }).join(' ');

    // Gradient fill area
    const areaPoints = [
      `${padding.x},${height - padding.y}`,
      ...history.map((val, i) => {
        const x = padding.x + i * xStep;
        const y = height - padding.y - ((val / 100) * (height - padding.y * 2));
        return `${x},${y}`;
      }),
      `${padding.x + (history.length - 1) * xStep},${height - padding.y}`
    ].join(' ');

    // Y axis reference lines
    const refs = [25, 50, 75];

    return (
      <div className="relative mt-2">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-[60px] flex flex-col justify-between pr-1 text-[8px] font-mono text-cyber-text/30 pointer-events-none">
          <span>100</span>
          <span>50</span>
          <span>0</span>
        </div>
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible ml-5" style={{ width: 'calc(100% - 20px)' }}>
          {/* Reference lines */}
          {refs.map(r => {
            const ry = height - padding.y - ((r / 100) * (height - padding.y * 2));
            return (
              <line
                key={r}
                x1={padding.x}
                y1={ry}
                x2={width - padding.x}
                y2={ry}
                stroke={r === 75 ? 'rgba(0,242,254,0.12)' : 'rgba(255,255,255,0.05)'}
                strokeWidth="1"
                strokeDasharray={r === 75 ? '4,3' : '2,4'}
              />
            );
          })}

          {/* Area fill */}
          <polygon
            points={areaPoints}
            fill="url(#attentionGradient)"
            opacity="0.3"
          />

          {/* Gradient definition */}
          <defs>
            <linearGradient id="attentionGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#00f2fe" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Line */}
          <polyline
            fill="none"
            stroke="#00f2fe"
            strokeWidth="2"
            strokeLinejoin="round"
            points={points}
            style={{ filter: 'drop-shadow(0 0 4px rgba(0,242,254,0.6))' }}
          />

          {/* Data points */}
          {history.map((val, i) => {
            const x = padding.x + i * xStep;
            const y = height - padding.y - ((val / 100) * (height - padding.y * 2));
            const isLast = i === history.length - 1;
            return (
              <g key={i}>
                {isLast && (
                  <circle cx={x} cy={y} r="6" fill="rgba(155,93,229,0.2)" className="animate-ping" style={{ animationDuration: '1.5s' }} />
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={isLast ? '3.5' : '2'}
                  fill={isLast ? '#9b5de5' : val >= 75 ? '#00f2fe' : val >= 50 ? '#f59e0b' : '#f43f5e'}
                  style={isLast ? { filter: 'drop-shadow(0 0 6px rgba(155,93,229,0.9))' } : {}}
                />
                {/* Tooltip on hover for last point */}
                {isLast && (
                  <text x={x + 5} y={y - 4} fill="#9b5de5" fontSize="8" fontFamily="monospace">
                    {val}%
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {/* Current score badge below graph */}
        <div className="mt-1 flex items-center justify-between text-[8px] font-mono text-cyber-text/40">
          <span>Session Start</span>
          <span className={`font-bold ${currentScore >= 75 ? 'text-cyber-cyan' : 'text-cyber-pink'}`}>
            LIVE: {currentScore}%
          </span>
          <span>Now</span>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col space-y-6">
      
      {/* 🚀 STUDENT DASHBOARD HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-cyber-border/20 pb-4">
        <div className="text-left font-mono">
          <span className="text-[10px] text-cyber-blue font-bold tracking-widest uppercase">Student Operations Center</span>
          <h1 className="font-outfit font-black text-2xl text-white mt-1">
            {t.welcomeBack.replace('{name}', user.name?.split(' ')[0] || 'Scholar')}
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
            <Flame className="w-5 h-5 animate-bounce" />
          </div>
          <div className="text-left font-mono">
            <span className="text-[9px] text-cyber-text/50 uppercase">Current Streak</span>
            <div className="text-lg font-bold text-white mt-0.5">{user.streak} Days</div>
          </div>
        </div>

        {/* Level */}
        <div className="glass-panel p-4 rounded-xl border border-cyber-border/40 flex items-center space-x-4">
          <div className="p-3 bg-cyber-purple/15 rounded-lg text-cyber-purple">
            <Award className="w-5 h-5" />
          </div>
          <div className="text-left font-mono">
            <span className="text-[9px] text-cyber-text/50 uppercase">Current Level</span>
            <div className="text-lg font-bold text-white mt-0.5">Level {user.level}</div>
          </div>
        </div>

        {/* Live Attention Score */}
        <div className="glass-panel p-4 rounded-xl border border-cyber-border/40 flex items-center space-x-4">
          <div className={`p-3 rounded-lg ${currentScore >= 75 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
            <Eye className="w-5 h-5 animate-pulse" />
          </div>
          <div className="text-left font-mono">
            <span className="text-[9px] text-cyber-text/50 uppercase">Live Attention</span>
            <div className={`text-lg font-bold mt-0.5 ${currentScore >= 75 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {currentScore}%
            </div>
          </div>
        </div>

        {/* XP Points */}
        <div className="glass-panel p-4 rounded-xl border border-cyber-border/40 flex flex-col justify-between">
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

          {/* Live Focus Timeline Graph */}
          <div className="md:col-span-7 glass-panel p-5 rounded-2xl border border-cyber-border/40 flex flex-col justify-between shadow-glass relative">
            {/* Live badge */}
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-cyber-cyan/15 px-2 py-0.5 rounded text-[8px] font-mono text-cyber-cyan">
              <span className="w-1.5 h-1.5 rounded-full bg-cyber-cyan animate-pulse inline-block"></span>
              LIVE TELEMETRY
            </div>

            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyber-blue flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4" /> Focus Timeline
              </h3>
              <p className="text-[9px] text-cyber-text/60 font-mono mt-1 leading-relaxed">
                Real-time gaze attention plotted from client-side facial landmark analysis. Updates every 3 seconds.
              </p>
              {renderAttentionGraph()}
            </div>

            <div className="mt-4 pt-3 border-t border-cyber-border/20 grid grid-cols-3 gap-2 text-center text-[9px] font-mono">
              <div>
                <span className="text-cyber-text/50 uppercase block mb-0.5">Gaze Direction</span>
                <div className={`font-bold ${gazeInfo.color}`}>{gazeInfo.label}</div>
              </div>
              <div>
                <span className="text-cyber-text/50 uppercase block mb-0.5">Session Time</span>
                <div className="text-cyber-purple font-bold flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3" /> {formatDuration(sessionSeconds)}
                </div>
              </div>
              <div>
                <span className="text-cyber-text/50 uppercase block mb-0.5">Status</span>
                <div className={`font-bold ${statusInfo.color}`}>{statusInfo.label}</div>
              </div>
            </div>

            {/* Mini bar chart — attention score history */}
            <div className="mt-3 flex items-end gap-0.5 h-8">
              {history.slice(-20).map((val, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm transition-all duration-300"
                  style={{
                    height: `${Math.max(4, (val / 100) * 32)}px`,
                    backgroundColor: val >= 75 ? 'rgba(0,242,254,0.5)' : val >= 50 ? 'rgba(245,158,11,0.5)' : 'rgba(244,63,94,0.5)',
                    boxShadow: i === history.length - 1 ? `0 0 6px ${val >= 75 ? '#00f2fe' : '#f43f5e'}` : 'none'
                  }}
                  title={`${val}%`}
                />
              ))}
            </div>
          </div>

        </div>

      </main>

    </div>
  );
};
