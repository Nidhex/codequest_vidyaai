import React, { useState, useEffect } from 'react';
import { useMainStore } from '../store/mainStore';
import { 
  ArrowLeft, BarChart2, Calendar, ShieldCheck, Clock, Award, 
  Trophy, AlertTriangle, Sparkles, TrendingUp, BookOpen, 
  User, Flame, CheckCircle, Target, ChevronRight, Activity 
} from 'lucide-react';

interface AnalyticsPanelProps {
  onNavigate: (page: string) => void;
}

interface QuizHistoryItem {
  id: string;
  topic: string;
  subject: string;
  score: number;
  date: string;
}

interface RecommendationItem {
  type: string;
  title: string;
  description: string;
  actionLabel: string;
  subject: string;
  topic: string;
}

interface WeakTopicItem {
  subject: string;
  chapter: string;
  topic: string;
  score: number;
  timestamp: string;
}

interface StatsData {
  userId: string;
  userName: string;
  totalStudyTime: number;
  lessonsCompletedCount: number;
  weeklyStreak: number;
  totalXP: number;
  level: number;
  subjectProgress: Record<string, number>;
  weakTopics: WeakTopicItem[];
  quizAnalytics: {
    avgQuizScore: number;
    quizAccuracy: number;
    hardestSubject: string;
    easiestSubject: string;
    recentQuizHistory: QuizHistoryItem[];
  };
  heatmap: Array<{ date: string; count: number }>;
  focusTracking: {
    avgSessionDuration: number;
    peakFocusHour: string;
    attentionHistory: number[];
  };
  recommendations: RecommendationItem[];
}

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ onNavigate }) => {
  const { user } = useMainStore();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:5000/api/learning/activity/stats?userId=${user.id}`);
        const data = await response.json();
        if (data.success && data.stats) {
          setStats(data.stats);
        } else {
          setError(data.error || "Failed to load telemetry stats.");
        }
      } catch (err) {
        console.error("Telemetry fetch error:", err);
        setError("Unable to connect to analytics compiler server.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="w-full min-h-[80vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-cyber-cyan border-t-transparent rounded-full animate-spin"></div>
        <p className="font-mono text-xs text-cyber-cyan animate-pulse uppercase">Assembling educational intelligence dashboard...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center space-y-4 text-center">
        <AlertTriangle className="w-12 h-12 text-cyber-pink animate-bounce" />
        <p className="font-mono text-sm text-cyber-pink">{error || "Analytics compilation failed."}</p>
        <button 
          onClick={() => onNavigate('dashboard')} 
          className="px-4 py-2 border border-cyber-border hover:border-white rounded-xl text-xs font-mono text-white transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-slate-950 border-slate-800/40 text-cyber-text/20';
    if (count === 1) return 'bg-emerald-950/70 border-emerald-900/60 text-emerald-400';
    if (count === 2) return 'bg-emerald-800/50 border-emerald-700/60 text-emerald-200';
    return 'bg-emerald-500 border-emerald-400 text-slate-900 font-black shadow-[0_0_10px_rgba(16,185,129,0.35)] animate-pulse';
  };

  const getSubjectColor = (subject: string): { text: string; bg: string; fill: string } => {
    const s = subject.toLowerCase();
    if (s.includes('sci')) return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', fill: 'bg-emerald-500' };
    if (s.includes('math')) return { text: 'text-cyber-blue', bg: 'bg-cyber-blue/10', fill: 'bg-cyber-blue' };
    if (s.includes('eng')) return { text: 'text-cyber-purple', bg: 'bg-cyber-purple/10', fill: 'bg-cyber-purple' };
    if (s.includes('hind')) return { text: 'text-cyber-pink', bg: 'bg-cyber-pink/10', fill: 'bg-cyber-pink' };
    return { text: 'text-cyber-yellow', bg: 'bg-cyber-yellow/10', fill: 'bg-cyber-yellow' };
  };

  const overallScore = Math.round(
    Object.values(stats.subjectProgress).reduce((a, b) => a + b, 0) / 
    (Object.keys(stats.subjectProgress).length || 1)
  );

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

        <div className="flex items-center gap-1 bg-black/45 px-2.5 py-1 rounded-lg border border-cyber-border/25 text-[10px]">
          <User className="w-3.5 h-3.5 text-cyber-purple" />
          <span>Student: <strong className="text-white">{stats.userName}</strong></span>
        </div>
      </div>

      {/* OVERVIEW STATS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Focus Hours */}
        <div className="glass-panel p-4 rounded-2xl border border-cyber-border/30 bg-gradient-to-br from-black/40 to-cyan-950/10 shadow-glass flex items-center justify-between text-left font-mono">
          <div className="space-y-1">
            <span className="text-[10px] text-cyber-text/50 uppercase tracking-wider block">Total Study Time</span>
            <span className="text-3xl font-black text-white">{Math.round(stats.totalStudyTime)} <span className="text-xs font-normal text-cyber-text/60">mins</span></span>
            <span className="text-[9px] text-cyber-cyan block">~{Math.round(stats.totalStudyTime / 60 * 10) / 10} hours logged</span>
          </div>
          <div className="p-3 bg-cyber-blue/10 border border-cyber-blue/20 rounded-xl text-cyber-blue">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Lessons Completed */}
        <div className="glass-panel p-4 rounded-2xl border border-cyber-border/30 bg-gradient-to-br from-black/40 to-purple-950/10 shadow-glass flex items-center justify-between text-left font-mono">
          <div className="space-y-1">
            <span className="text-[10px] text-cyber-text/50 uppercase tracking-wider block">Lessons Completed</span>
            <span className="text-3xl font-black text-white">{stats.lessonsCompletedCount} <span className="text-xs font-normal text-cyber-text/60">units</span></span>
            <span className="text-[9px] text-cyber-purple block">Across NCERT curriculum</span>
          </div>
          <div className="p-3 bg-cyber-purple/10 border border-cyber-purple/20 rounded-xl text-cyber-purple">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        {/* Weekly Streak */}
        <div className="glass-panel p-4 rounded-2xl border border-cyber-border/30 bg-gradient-to-br from-black/40 to-pink-950/10 shadow-glass flex items-center justify-between text-left font-mono">
          <div className="space-y-1">
            <span className="text-[10px] text-cyber-text/50 uppercase tracking-wider block">Active Streak</span>
            <span className="text-3xl font-black text-white">{stats.weeklyStreak} <span className="text-xs font-normal text-cyber-text/60">days</span></span>
            <span className="text-[9px] text-cyber-pink block">Consistent learning streak</span>
          </div>
          <div className="p-3 bg-cyber-pink/10 border border-cyber-pink/20 rounded-xl text-cyber-pink animate-bounce">
            <Flame className="w-5 h-5 fill-cyber-pink" />
          </div>
        </div>

        {/* Overall Mastery Score */}
        <div className="glass-panel p-4 rounded-2xl border border-cyber-border/30 bg-gradient-to-br from-black/40 to-amber-950/10 shadow-glass flex items-center justify-between text-left font-mono">
          <div className="space-y-1">
            <span className="text-[10px] text-cyber-text/50 uppercase tracking-wider block">Learning Score</span>
            <span className="text-3xl font-black text-white">{overallScore}%</span>
            <span className="text-[9px] text-cyber-yellow block">Level {stats.level} ({stats.totalXP} XP)</span>
          </div>
          <div className="p-3 bg-cyber-yellow/10 border border-cyber-yellow/20 rounded-xl text-cyber-yellow">
            <Trophy className="w-5 h-5 fill-cyber-yellow" />
          </div>
        </div>

      </div>

      {/* DETAILED DIAGNOSTIC SECTION */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COMPONENT: SUBJECTS PROGRESS & HEATMAP */}
        <div className="lg:col-span-6 flex flex-col space-y-6">
          
          {/* Subject Mastery Panel */}
          <div className="glass-panel p-5 rounded-2xl border border-cyber-border/40 shadow-glass flex flex-col space-y-4 text-left font-mono">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyber-blue flex items-center gap-1.5 border-b border-cyber-border/20 pb-2.5">
              <Award className="w-4.5 h-4.5 text-cyber-blue" /> Subject-wise Curriculum Mastery
            </h3>
            
            <div className="space-y-3.5">
              {Object.entries(stats.subjectProgress).map(([subj, val]) => {
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
            
            <p className="text-[9px] text-cyber-text/40 leading-relaxed font-sans mt-1">
              * Mastery values are calculated dynamically using weighted scores from practice zone quizzes (70%) and lesson sheet view time (30%).
            </p>
          </div>

          {/* GitHub Style Learning Heatmap */}
          <div className="glass-panel p-5 rounded-2xl border border-cyber-border/40 shadow-glass flex flex-col space-y-4 text-left font-mono">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyber-cyan flex items-center gap-1.5 border-b border-cyber-border/20 pb-2.5">
              <Calendar className="w-4.5 h-4.5 text-cyber-cyan" /> 28-Day Study Activity Matrix
            </h3>
            
            <div className="flex flex-col md:flex-row items-center gap-6 justify-center">
              
              {/* Dynamic Grid */}
              <div className="grid grid-cols-7 gap-2 p-3 bg-black/35 rounded-xl border border-cyber-border/15 max-w-sm">
                {stats.heatmap.map((day, idx) => {
                  const d = new Date(day.date);
                  const formattedDate = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                  return (
                    <div 
                      key={idx} 
                      title={`${formattedDate}: ${day.count} session(s)`}
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center text-[10px] font-bold font-mono transition-all hover:scale-115 cursor-default ${getHeatmapColor(day.count)}`}
                    >
                      {d.getDate()}
                    </div>
                  );
                })}
              </div>

              {/* Legends */}
              <div className="space-y-3 text-xs md:max-w-[200px] w-full">
                <div className="p-2.5 bg-black/40 rounded-lg border border-cyber-border/10 space-y-2 text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 bg-slate-950 border border-slate-800 rounded"></span>
                    <span>No Activity (0 logs)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 bg-emerald-950/70 border border-emerald-900/60 rounded"></span>
                    <span>Mild Progress (1 log)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 bg-emerald-800/50 border border-emerald-700/60 rounded"></span>
                    <span>Standard Focus (2 logs)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 bg-emerald-500 border border-emerald-400 rounded animate-pulse"></span>
                    <span>Peak Consistent (3+ logs)</span>
                  </div>
                </div>
                
                <div className="text-[10px] text-cyber-text/50 text-center leading-relaxed">
                  Log in daily and complete lessons to paint the grid green!
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* RIGHT COMPONENT: WEAK TOPICS, QUIZ STATS, FOCUS LOGS, AI RECOMMENDATION COACH */}
        <div className="lg:col-span-6 flex flex-col space-y-6">
          
          {/* Weak Topics and Practice Recommendations */}
          <div className="glass-panel p-5 rounded-2xl border border-cyber-border/40 shadow-glass flex flex-col space-y-4 text-left font-mono">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyber-pink flex items-center gap-1.5 border-b border-cyber-border/20 pb-2.5">
              <AlertTriangle className="w-4.5 h-4.5 text-cyber-pink" /> Weak Concepts Detected
            </h3>
            
            {stats.weakTopics.length > 0 ? (
              <div className="space-y-2">
                {stats.weakTopics.map((wt, idx) => {
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

          {/* Focus Logs Panel */}
          <div className="glass-panel p-5 rounded-2xl border border-cyber-border/40 shadow-glass flex flex-col space-y-4 text-left font-mono">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyber-purple flex items-center gap-1.5 border-b border-cyber-border/20 pb-2.5">
              <Activity className="w-4.5 h-4.5 text-cyber-purple" /> Focus Dynamics & Attention Graph
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="space-y-2.5">
                <div className="flex justify-between items-center p-2 bg-black/40 rounded-xl border border-cyber-border/15">
                  <span className="text-[10px] text-cyber-text/70">Average Session Length</span>
                  <span className="font-bold text-white text-xs">{stats.focusTracking.avgSessionDuration} mins</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-black/40 rounded-xl border border-cyber-border/15">
                  <span className="text-[10px] text-cyber-text/70">Peak Productivity Hour</span>
                  <span className="font-bold text-white text-xs">{stats.focusTracking.peakFocusHour}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-black/40 rounded-xl border border-cyber-border/15">
                  <span className="text-[10px] text-cyber-text/70">Lessons Studied</span>
                  <span className="font-bold text-white text-xs">{stats.lessonsCompletedCount} units</span>
                </div>
              </div>

              {/* Dynamic Attention Bar Chart */}
              <div className="flex flex-col justify-end bg-black/35 p-3 rounded-xl border border-cyber-border/15">
                <span className="text-[9px] text-cyber-text/50 uppercase block mb-1 font-mono text-center">Gaze Attention Trend</span>
                <div className="flex items-end justify-between h-20 gap-1.5 pt-2">
                  {stats.focusTracking.attentionHistory.map((score, idx) => (
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

          {/* Quiz performance telemetry */}
          <div className="glass-panel p-5 rounded-2xl border border-cyber-border/40 shadow-glass flex flex-col space-y-4 text-left font-mono">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyber-yellow flex items-center gap-1.5 border-b border-cyber-border/20 pb-2.5">
              <Target className="w-4.5 h-4.5 text-cyber-yellow" /> Quiz Analytics & History
            </h3>
            
            <div className="grid grid-cols-2 gap-3 mb-2 font-mono text-[10px]">
              <div className="p-3 bg-black/40 rounded-xl border border-cyber-border/20 flex flex-col items-center justify-center">
                <span className="text-cyber-text/50 uppercase">Average Quiz Score</span>
                <span className="text-lg font-black text-cyber-cyan mt-0.5">{stats.quizAnalytics.avgQuizScore}%</span>
              </div>
              <div className="p-3 bg-black/40 rounded-xl border border-cyber-border/20 flex flex-col items-center justify-center">
                <span className="text-cyber-text/50 uppercase">Practice Accuracy</span>
                <span className="text-lg font-black text-cyber-yellow mt-0.5">{stats.quizAnalytics.quizAccuracy}%</span>
              </div>
            </div>

            {/* Recent history list */}
            {stats.quizAnalytics.recentQuizHistory.length > 0 ? (
              <div className="space-y-1.5 font-mono text-[10px]">
                <span className="text-[8px] text-cyber-text/50 uppercase block font-bold">Recent Attempts</span>
                {stats.quizAnalytics.recentQuizHistory.map((qHist) => (
                  <div key={qHist.id} className="flex justify-between items-center p-2.5 bg-black/35 rounded-lg border border-cyber-border/10">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${getSubjectColor(qHist.subject).fill}`} />
                      <div>
                        <span className="text-white font-bold">{qHist.topic}</span>
                        <span className="text-[9px] text-cyber-text/40 block">{qHist.subject} · {qHist.date}</span>
                      </div>
                    </div>
                    <span className={`font-black ${qHist.score >= 70 ? 'text-green-400' : 'text-cyber-pink'}`}>{qHist.score}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-cyber-text/45 text-center">No quiz history available. Play in Practice Zone to unlock.</p>
            )}
          </div>

          {/* AI recommendations coach */}
          <div className="glass-panel p-5 rounded-2xl border border-cyber-border/40 bg-gradient-to-br from-black/45 via-black/30 to-purple-950/5 shadow-glass flex flex-col space-y-4 text-left font-mono">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyber-cyan flex items-center gap-1.5 border-b border-cyber-border/20 pb-2.5 animate-pulse">
              <Sparkles className="w-4.5 h-4.5 text-cyber-cyan" /> Vidya AI Learning Recommendations
            </h3>
            
            <div className="grid grid-cols-1 gap-3">
              {stats.recommendations.map((rec, idx) => (
                <div key={idx} className="p-3 bg-black/55 rounded-xl border border-cyber-purple/20 flex items-start gap-3 justify-between">
                  <div className="space-y-1 text-left">
                    <span className="text-[9px] font-bold text-cyber-cyan uppercase tracking-wider flex items-center gap-1">
                      {rec.type === 'revision' ? '⚠️ Revision Required' : '📚 Recommended Task'}
                    </span>
                    <h4 className="text-white text-xs font-bold">{rec.title}</h4>
                    <p className="text-[10px] text-cyber-text/75 leading-relaxed font-sans">{rec.description}</p>
                  </div>
                  
                  <button 
                    onClick={() => {
                      if (rec.type === 'quiz' || rec.type === 'revision') {
                        onNavigate('practice');
                      } else if (rec.type === 'feynman') {
                        onNavigate('feynman');
                      }
                    }}
                    className="shrink-0 p-2 bg-cyber-purple/15 hover:bg-cyber-purple/25 border border-cyber-purple/35 rounded-lg text-cyber-purple text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1"
                  >
                    <span>Go</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
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
  );
};
