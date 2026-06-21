import { create } from 'zustand';

export interface StudyLog {
  id: string;
  userId: string;
  activityType: 'quiz' | 'lesson' | 'debate' | 'feynman';
  subject: string;
  chapter: string;
  topic: string;
  timestamp: string;
  timeSpent: number; // in minutes
  score?: number;
  totalQuestions?: number;
  correctAnswers?: number;
  wrongAnswers?: number;
  xpEarned?: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string;
  icon: string;
}

export interface ToastNotification {
  id: string;
  text: string;
  type: 'xp' | 'mastery' | 'streak' | 'weakness' | 'achievement' | 'info';
}

export interface AnalyticsStats {
  userId: string;
  userName: string;
  totalStudyTime: number;
  lessonsCompletedCount: number;
  weeklyStreak: number;
  totalXP: number;
  level: number;
  subjectProgress: Record<string, number>;
  weakTopics: Array<{
    subject: string;
    chapter: string;
    topic: string;
    score: number;
    timestamp: string;
  }>;
  quizAnalytics: {
    avgQuizScore: number;
    quizAccuracy: number;
    hardestSubject: string;
    easiestSubject: string;
    recentQuizHistory: Array<{
      id: string;
      topic: string;
      subject: string;
      score: number;
      date: string;
    }>;
  };
  heatmap: Array<{ date: string; count: number; minutes: number; xp: number }>;
  focusTracking: {
    avgSessionDuration: number;
    peakFocusHour: string;
    attentionHistory: number[];
  };
  recommendations: Array<{
    type: string;
    title: string;
    description: string;
    actionLabel: string;
    subject: string;
    topic: string;
  }>;
}

interface AnalyticsStore {
  studyLogs: StudyLog[];
  subjectMastery: Record<string, number>;
  xp: number;
  level: number;
  streak: number;
  weakTopics: AnalyticsStats['weakTopics'];
  heatmapData: AnalyticsStats['heatmap'];
  quizStats: AnalyticsStats['quizAnalytics'];
  focusStats: AnalyticsStats['focusTracking'];
  achievements: Achievement[];
  notifications: ToastNotification[];
  overallLearningScore: number;
  rankLabel: string;
  loading: boolean;
  
  // Actions
  loadStats: (userId: string) => Promise<void>;
  addActivityLog: (log: Omit<StudyLog, 'id' | 'timestamp' | 'xpEarned'> & { difficulty?: string }) => Promise<void>;
  addNotification: (text: string, type: ToastNotification['type']) => void;
  removeNotification: (id: string) => void;
  resetStore: () => void;
}

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: 'quiz_master', title: 'Quiz Master', description: 'Complete 5 Practice Zone or Arena quizzes.', unlocked: false, icon: '🎯' },
  { id: 'science_explorer', title: 'Science Explorer', description: 'Reach 85% mastery in Science subjects.', unlocked: false, icon: '🌱' },
  { id: '7_day_streak', title: '7-Day Streak', description: 'Maintain a study streak for 7 consecutive days.', unlocked: false, icon: '🔥' },
  { id: 'debate_champion', title: 'Debate Champion', description: 'Participate in 3 Debate Arena matchups.', unlocked: false, icon: '🤺' },
  { id: 'socratic_scholar', title: 'Socratic Scholar', description: 'Complete 3 Feynman Arena tutoring dialogues.', unlocked: false, icon: '🧠' },
  { id: 'fast_learner', title: 'Fast Learner', description: 'Score 100% on a Hard difficulty quiz.', unlocked: false, icon: '🚀' }
];

export const useAnalyticsStore = create<AnalyticsStore>((set, get) => ({
  studyLogs: [],
  subjectMastery: { Science: 0, Mathematics: 0, 'Social Science': 0, English: 0, Hindi: 0 },
  xp: 0,
  level: 1,
  streak: 0,
  weakTopics: [],
  heatmapData: [],
  quizStats: { avgQuizScore: 0, quizAccuracy: 0, hardestSubject: 'None', easiestSubject: 'None', recentQuizHistory: [] },
  focusStats: { avgSessionDuration: 0, peakFocusHour: 'N/A', attentionHistory: [] },
  achievements: DEFAULT_ACHIEVEMENTS,
  notifications: [],
  overallLearningScore: 0,
  rankLabel: 'Beginner Learner',
  loading: false,

  addNotification: (text, type) => {
    const id = "toast-" + Math.random().toString(36).substr(2, 9);
    set(state => ({
      notifications: [...state.notifications, { id, text, type }]
    }));
    setTimeout(() => {
      get().removeNotification(id);
    }, 4000);
  },

  removeNotification: (id) => {
    set(state => ({
      notifications: state.notifications.filter(n => n.id !== id)
    }));
  },

  resetStore: () => {
    set({
      studyLogs: [],
      subjectMastery: { Science: 0, Mathematics: 0, 'Social Science': 0, English: 0, Hindi: 0 },
      xp: 0,
      level: 1,
      streak: 0,
      weakTopics: [],
      heatmapData: [],
      quizStats: { avgQuizScore: 0, quizAccuracy: 0, hardestSubject: 'None', easiestSubject: 'None', recentQuizHistory: [] },
      focusStats: { avgSessionDuration: 0, peakFocusHour: 'N/A', attentionHistory: [] },
      achievements: DEFAULT_ACHIEVEMENTS.map(ach => ({ ...ach, unlocked: false, unlockedAt: undefined })),
      overallLearningScore: 0,
      rankLabel: 'Beginner Learner'
    });
  },

  loadStats: async (userId) => {
    set({ loading: true });
    try {
      const res = await fetch(`http://localhost:5000/api/learning/activity/stats?userId=${userId}`);
      const data = await res.json();
      if (data.success && data.stats) {
        const stats: AnalyticsStats = data.stats;
        
        // Recalculate overall score from backend-synced stats
        const subjects = Object.values(stats.subjectProgress);
        const avgMastery = subjects.length > 0
          ? Math.round(subjects.reduce((a: number, b: number) => a + b, 0) / subjects.length)
          : 0;

        // Only calculate a score if the student has actual activity
        const hasActivity = stats.totalStudyTime > 0 || stats.lessonsCompletedCount > 0;
        const quizAccuracy = stats.quizAnalytics.quizAccuracy || 0;
        const consistency = Math.min((stats.weeklyStreak / 7) * 100, 100);
        const studyTimeScore = Math.min((stats.totalStudyTime / 300) * 100, 100);
        
        const overallScore = hasActivity
          ? Math.round(quizAccuracy * 0.4 + consistency * 0.2 + studyTimeScore * 0.2 + avgMastery * 0.2)
          : 0;
        
        set({
          studyLogs: [],
          subjectMastery: stats.subjectProgress,
          xp: stats.totalXP,
          level: stats.level,
          streak: stats.weeklyStreak,
          weakTopics: stats.weakTopics,
          heatmapData: stats.heatmap,
          quizStats: stats.quizAnalytics,
          focusStats: stats.focusTracking,
          overallLearningScore: overallScore,
          rankLabel: stats.level >= 10 ? 'AI Master' : stats.level >= 6 ? 'Advanced Scholar' : stats.level >= 3 ? 'Consistent Learner' : 'Beginner Learner'
        });
      }
    } catch (err) {
      console.error("Failed to load telemetry stats inside store:", err);
    } finally {
      set({ loading: false });
    }
  },

  addActivityLog: async (logInput) => {
    const now = new Date();
    const timestamp = now.toISOString();
    const id = "log-" + Math.random().toString(36).substr(2, 9);
    
    // --- 1. REALISTIC XP REWARDS ENGINE ---
    // Gradual progression: first activities earn small XP, builds over time
    let xpToAdd = 10; // base minimum

    if (logInput.activityType === 'quiz') {
      // Score-based: 5–25 XP range
      const scoreRatio = logInput.score !== undefined ? logInput.score / 100 : 0.5;
      xpToAdd = Math.round(5 + scoreRatio * 20);
    } else if (logInput.activityType === 'lesson') {
      xpToAdd = 15; // flat 15 XP per lesson
    } else if (logInput.activityType === 'feynman') {
      const scoreRatio = logInput.score !== undefined ? logInput.score / 100 : 0.5;
      xpToAdd = Math.round(10 + scoreRatio * 15); // 10-25 XP
    } else if (logInput.activityType === 'debate') {
      const scoreRatio = logInput.score !== undefined ? logInput.score / 100 : 0.5;
      xpToAdd = Math.round(10 + scoreRatio * 20); // 10-30 XP
    }

    // Small streak bonus: +2 XP per streak day, max +10 XP
    const currentStreak = get().streak;
    const streakBonus = Math.min(currentStreak * 2, 10);
    const totalXPToAdd = xpToAdd + streakBonus;

    const newXP = get().xp + totalXPToAdd;
    const newLevel = Math.floor(newXP / 500) + 1; // 500 XP per level

    // --- 2. COMPILE LOGS & RECALCULATE STATE LOCALLY ---
    const newLog: StudyLog = {
      id,
      timestamp,
      xpEarned: totalXPToAdd,
      ...logInput
    };
    
    const newLogs = [...get().studyLogs, newLog];
    
    // Recalculate Subject Mastery
    const updatedMastery = { ...get().subjectMastery };
    const sub = logInput.subject;
    const subLogs = newLogs.filter(l => l.subject.toLowerCase() === sub.toLowerCase());
    const gradedLogs = subLogs.filter(l => l.score !== undefined && l.score !== null);
    const lessonLogs = subLogs.filter(l => l.activityType === 'lesson');
    
    let avgScore = 0;
    if (gradedLogs.length > 0) {
      avgScore = gradedLogs.reduce((sum, l) => sum + (l.score || 0), 0) / gradedLogs.length;
    }
    const lessonCount = lessonLogs.length;
    const lessonProgress = Math.min(lessonCount * 20, 100);
    // Weighted: graded score (70%) + lesson completion (30%), minimum 0 for new users
    const masteryVal = gradedLogs.length > 0 || lessonLogs.length > 0
      ? Math.round((avgScore * 0.7) + (lessonProgress * 0.3))
      : 0;
    updatedMastery[sub] = Math.min(Math.max(masteryVal, 0), 100);

    // Recalculate weak topics
    const updatedWeakMap = new Map<string, {
      subject: string;
      chapter: string;
      topic: string;
      score: number;
      timestamp: string;
    }>();
    // First copy existing
    get().weakTopics.forEach(wt => updatedWeakMap.set(wt.topic, wt));
    if (logInput.score !== undefined && logInput.topic) {
      if (logInput.score < 70) {
        updatedWeakMap.set(logInput.topic, {
          subject: logInput.subject,
          chapter: logInput.chapter,
          topic: logInput.topic,
          score: Math.round(logInput.score),
          timestamp
        });
      } else if (logInput.score >= 80) {
        updatedWeakMap.delete(logInput.topic); // mastered
      }
    }
    const updatedWeakTopics = Array.from(updatedWeakMap.values());

    // Update Achievements Check
    const updatedAchievements = get().achievements.map(ach => {
      if (ach.unlocked) return ach;
      let shouldUnlock = false;
      
      if (ach.id === 'quiz_master') {
        shouldUnlock = newLogs.filter(l => l.activityType === 'quiz').length >= 5;
      } else if (ach.id === 'science_explorer') {
        shouldUnlock = (updatedMastery['Science'] || 0) >= 85;
      } else if (ach.id === '7_day_streak') {
        shouldUnlock = currentStreak >= 7;
      } else if (ach.id === 'debate_champion') {
        shouldUnlock = newLogs.filter(l => l.activityType === 'debate').length >= 3;
      } else if (ach.id === 'socratic_scholar') {
        shouldUnlock = newLogs.filter(l => l.activityType === 'feynman').length >= 3;
      } else if (ach.id === 'fast_learner') {
        shouldUnlock = logInput.activityType === 'quiz' && logInput.difficulty === 'hard' && logInput.score === 100;
      }
      
      if (shouldUnlock) {
        get().addNotification(`🏆 Achievement Unlocked: ${ach.title}!`, 'achievement');
        return { ...ach, unlocked: true, unlockedAt: timestamp };
      }
      return ach;
    });

    // Update Heatmap local logs — add today's entry if not present
    const dateStr = timestamp.split('T')[0];
    const existingHeatmapEntry = get().heatmapData.find(h => h.date === dateStr);
    let updatedHeatmap: Array<{ date: string; count: number; minutes: number; xp: number }>;
    if (existingHeatmapEntry) {
      updatedHeatmap = get().heatmapData.map(h => {
        if (h.date === dateStr) {
          return {
            ...h,
            count: h.count + 1,
            minutes: h.minutes + logInput.timeSpent,
            xp: h.xp + totalXPToAdd
          };
        }
        return h;
      });
    } else {
      // Today doesn't exist in heatmap yet — add it
      updatedHeatmap = [
        ...get().heatmapData,
        { date: dateStr, count: 1, minutes: logInput.timeSpent, xp: totalXPToAdd }
      ];
    }

    // Recalculate Quiz analytics
    const quizLogs = newLogs.filter(l => l.activityType === 'quiz');
    let avgQuizScore = get().quizStats.avgQuizScore;
    let quizAccuracy = get().quizStats.quizAccuracy;
    let hardestSubject = get().quizStats.hardestSubject;
    let easiestSubject = get().quizStats.easiestSubject;
    
    if (quizLogs.length > 0) {
      const totalScore = quizLogs.reduce((acc, q) => acc + (q.score || 0), 0);
      avgQuizScore = Math.round(totalScore / quizLogs.length);
      
      const totalQ = quizLogs.reduce((acc, q) => acc + (q.totalQuestions || 0), 0);
      const totalC = quizLogs.reduce((acc, q) => acc + (q.correctAnswers || 0), 0);
      quizAccuracy = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : avgQuizScore;
    }

    const recentQuizHistory = quizLogs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5)
      .map(q => ({
        id: q.id,
        topic: q.topic || q.chapter || "General Practice",
        subject: q.subject,
        score: Math.round(q.score || 0),
        date: new Date(q.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
      }));

    // Focus Tracking
    const activeSessions = newLogs.filter(l => l.timeSpent > 0);
    const avgSessionDuration = activeSessions.length > 0
      ? Math.round(activeSessions.reduce((acc, l) => acc + l.timeSpent, 0) / activeSessions.length)
      : get().focusStats.avgSessionDuration;

    // Recalculate overall learning score based on real activity only
    const consistencyScore = Math.min((currentStreak / 7) * 100, 100);
    const totalStudyTime = newLogs.reduce((acc, l) => acc + l.timeSpent, 0);
    const studyTimeScore = Math.min((totalStudyTime / 300) * 100, 100);

    const debateLogsScore = newLogs.filter(l => l.activityType === 'debate' && l.score !== undefined);
    const feynmanLogsScore = newLogs.filter(l => l.activityType === 'feynman' && l.score !== undefined);
    const debateAvg = debateLogsScore.length > 0 ? debateLogsScore.reduce((a, l) => a + (l.score || 0), 0) / debateLogsScore.length : 0;
    const feynmanAvg = feynmanLogsScore.length > 0 ? feynmanLogsScore.reduce((a, l) => a + (l.score || 0), 0) / feynmanLogsScore.length : 0;

    const overallScore = Math.round(
      quizAccuracy * 0.4 +
      consistencyScore * 0.2 +
      studyTimeScore * 0.2 +
      debateAvg * 0.1 +
      feynmanAvg * 0.1
    );

    // --- 3. TOAST DISPATCH NOTIFICATION TRIGGERS ---
    get().addNotification(`+${totalXPToAdd} XP Earned! (${logInput.activityType})`, 'xp');
    if (updatedMastery[sub] > (get().subjectMastery[sub] || 0)) {
      get().addNotification(`${sub} Mastery Increased to ${updatedMastery[sub]}%!`, 'mastery');
    }
    if (logInput.score !== undefined && logInput.score < 70) {
      get().addNotification(`Concept needs review: ${logInput.topic}`, 'weakness');
    }

    // --- 4. APPLY LOCAL STATE UPDATE ---
    set({
      studyLogs: newLogs,
      subjectMastery: updatedMastery,
      xp: newXP,
      level: newLevel,
      weakTopics: updatedWeakTopics,
      heatmapData: updatedHeatmap,
      achievements: updatedAchievements,
      quizStats: {
        avgQuizScore,
        quizAccuracy,
        hardestSubject,
        easiestSubject,
        recentQuizHistory
      },
      focusStats: {
        ...get().focusStats,
        avgSessionDuration
      },
      overallLearningScore: overallScore,
      rankLabel: newLevel >= 10 ? 'AI Master' : newLevel >= 6 ? 'Advanced Scholar' : newLevel >= 3 ? 'Consistent Learner' : 'Beginner Learner'
    });

    // --- 5. ASYNC SYNC POST PERSISTENCE BACKEND ---
    try {
      await fetch('http://localhost:5000/api/learning/activity/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: newLog.userId,
          activityType: newLog.activityType,
          subject: newLog.subject,
          chapter: newLog.chapter,
          topic: newLog.topic,
          timeSpent: newLog.timeSpent,
          score: newLog.score,
          totalQuestions: newLog.totalQuestions,
          correctAnswers: newLog.correctAnswers,
          wrongAnswers: newLog.wrongAnswers
        })
      });
    } catch (err) {
      console.warn("Telemetry background persistence failed (saving locally in Zustand fallback):", err);
    }
  }
}));
