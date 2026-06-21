import { create } from 'zustand';

export interface UserProfile {
  id: string;
  role: 'student' | 'teacher' | 'admin';
  name: string;
  streak: number;
  xp: number;
  level: number;
  badges: string[];
  completedLessons: string[];
  streakLogs: number[];
  subjectProgress: Record<string, number>;
}

interface LessonState {
  title: string;
  explanation: string;
  codeMixed: string;
  curriculumPoints: string[];
  regionalExampleUsed: string;
  results?: any[];
}

interface FeynmanState {
  messages: Array<{ sender: 'ai' | 'student'; text: string }>;
  score: number;
  gaps: string[];
}

interface DebateState {
  room: string;
  argumentsList: Array<{ speaker: 'ai' | 'student'; text: string; timestamp: string }>;
  scores: { 
    logic: number; 
    grammar: number; 
    confidence: number; 
    reasoning: number; 
    communication: number;
    pronunciation: number;
    fluency: number;
    vocabulary: number;
    punctuation: number;
    criticalThinking: number;
  };
  activeTopic: string;
  userPosition: 'Proposer' | 'Opponent';
}

interface EngagementState {
  currentScore: number;
  ear: number;
  isDrowsy: boolean;
  attentionHistory: number[];
}

interface AccessibilityState {
  dyslexiaMode: boolean;
  highContrast: boolean;
  largeFont: boolean;
  simplifiedUI: boolean;
  textToSpeechEnabled: boolean;
}

interface MainStore {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  language: string;
  classLevel: number;
  region: string;
  lesson: LessonState | null;
  feynman: FeynmanState;
  debate: DebateState;
  engagement: EngagementState;
  accessibility: AccessibilityState;
  
  // Actions
  setUser: (user: UserProfile | null) => void;
  updateXP: (amount: number) => void;
  setLanguage: (lang: string) => void;
  setClassLevel: (level: number) => void;
  setRegion: (region: string) => void;
  setLesson: (lesson: LessonState | null) => void;
  addFeynmanMessage: (sender: 'ai' | 'student', text: string) => void;
  setFeynmanScores: (score: number, gaps: string[]) => void;
  resetFeynman: () => void;
  setDebateRoom: (room: string) => void;
  setDebateTopic: (topic: string, position: 'Proposer' | 'Opponent') => void;
  addDebateArgument: (speaker: 'ai' | 'student', text: string) => void;
  setDebateScores: (scores: DebateState['scores']) => void;
  resetDebate: () => void;
  updateEngagement: (score: number, ear: number, isDrowsy: boolean) => void;
  toggleAccessibility: (key: keyof AccessibilityState) => void;

  // Auth Actions
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  checkSession: () => Promise<boolean>;
}

export const useMainStore = create<MainStore>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  language: 'en',
  classLevel: 8,
  region: 'Punjab',
  lesson: null,
  feynman: {
    messages: [],
    score: 0,
    gaps: []
  },
  debate: {
    room: "debate_sandbox",
    argumentsList: [],
    scores: { 
      logic: 0, 
      grammar: 0, 
      confidence: 0, 
      reasoning: 0, 
      communication: 0,
      pronunciation: 0,
      fluency: 0,
      vocabulary: 0,
      punctuation: 0,
      criticalThinking: 0
    },
    activeTopic: "Artificial Intelligence in Agriculture",
    userPosition: "Proposer"
  },
  engagement: {
    currentScore: 90,
    ear: 0.28,
    isDrowsy: false,
    attentionHistory: [85, 88, 92, 90, 89, 91, 90]
  },
  accessibility: {
    dyslexiaMode: false,
    highContrast: false,
    largeFont: false,
    simplifiedUI: false,
    textToSpeechEnabled: true
  },

  setUser: (user) => set({ user }),
  updateXP: (amount) => set((state) => {
    if (!state.user) return {};
    const newXP = state.user.xp + amount;
    const newLevel = Math.floor(newXP / 400) + 1;
    let unlockedBadge = null;
    const updatedBadges = [...state.user.badges];
    
    if (newXP >= 1500 && !updatedBadges.includes("Legendary Learner")) {
      updatedBadges.push("Legendary Learner");
      unlockedBadge = "Legendary Learner";
    }

    return {
      user: {
        ...state.user,
        xp: newXP,
        level: newLevel,
        badges: updatedBadges
      }
    };
  }),
  setLanguage: (lang) => set({ language: lang }),
  setClassLevel: (level) => set({ classLevel: level }),
  setRegion: (region) => set({ region }),
  setLesson: (lesson) => set({ lesson }),
  addFeynmanMessage: (sender, text) => set((state) => ({
    feynman: {
      ...state.feynman,
      messages: [...state.feynman.messages, { sender, text }]
    }
  })),
  setFeynmanScores: (score, gaps) => set((state) => ({
    feynman: {
      ...state.feynman,
      score,
      gaps
    }
  })),
  resetFeynman: () => set({
    feynman: { messages: [], score: 0, gaps: [] }
  }),
  setDebateRoom: (room) => set((state) => ({
    debate: { ...state.debate, room }
  })),
  setDebateTopic: (topic, position) => set((state) => ({
    debate: { ...state.debate, activeTopic: topic, userPosition: position, argumentsList: [] }
  })),
  addDebateArgument: (speaker, text) => set((state) => ({
    debate: {
      ...state.debate,
      argumentsList: [...state.debate.argumentsList, { speaker, text, timestamp: new Date().toISOString() }]
    }
  })),
  setDebateScores: (scores) => set((state) => ({
    debate: { ...state.debate, scores }
  })),
  resetDebate: () => set((state) => ({
    debate: {
      ...state.debate,
      argumentsList: [],
      scores: { 
        logic: 0, 
        grammar: 0, 
        confidence: 0, 
        reasoning: 0, 
        communication: 0,
        pronunciation: 0,
        fluency: 0,
        vocabulary: 0,
        punctuation: 0,
        criticalThinking: 0
      }
    }
  })),
  updateEngagement: (score, ear, isDrowsy) => set((state) => {
    const history = [...state.engagement.attentionHistory, score].slice(-15);
    return {
      engagement: {
        currentScore: score,
        ear,
        isDrowsy,
        attentionHistory: history
      }
    };
  }),
  toggleAccessibility: (key) => set((state) => {
    const newVal = !state.accessibility[key];
    
    // Manage document body class list for global CSS overrides
    if (key === 'dyslexiaMode') {
      if (newVal) document.body.classList.add('dyslexia-mode');
      else document.body.classList.remove('dyslexia-mode');
    } else if (key === 'highContrast') {
      if (newVal) document.body.classList.add('high-contrast');
      else document.body.classList.remove('high-contrast');
    }
    
    return {
      accessibility: {
        ...state.accessibility,
        [key]: newVal
      }
    };
  }),

  // Auth actions
  login: (token, user) => {
    localStorage.setItem('token', token);
    set({ token, user, isAuthenticated: true });
    if (user.preferredLanguage) {
      set({ language: user.preferredLanguage });
    }
    if (user.role === 'student' && (user as any).class) {
      set({ classLevel: parseInt((user as any).class) || 8 });
    }
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, user: null, isAuthenticated: false });
    // Reset analytics store dynamically to avoid circular references
    try {
      const { useAnalyticsStore } = require('./analyticsStore');
      useAnalyticsStore.getState().resetStore();
    } catch (e) {
      console.warn("Could not dynamically reset analyticsStore:", e);
    }
  },
  checkSession: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ token: null, user: null, isAuthenticated: false });
      return false;
    }
    try {
      const res = await fetch('http://localhost:5000/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error("Token invalid");
      }
      const data = await res.json();
      if (data.success && data.user) {
        set({ token, user: data.user, isAuthenticated: true });
        if (data.user.preferredLanguage) {
          set({ language: data.user.preferredLanguage });
        }
        if (data.user.role === 'student' && data.user.class) {
          set({ classLevel: parseInt(data.user.class) || 8 });
        }
        return true;
      } else {
        localStorage.removeItem('token');
        set({ token: null, user: null, isAuthenticated: false });
        return false;
      }
    } catch (err) {
      console.error("Session check failed, logging out:", err);
      localStorage.removeItem('token');
      set({ token: null, user: null, isAuthenticated: false });
      return false;
    }
  }
}));
