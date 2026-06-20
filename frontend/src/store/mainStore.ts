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
  language: string;
  classLevel: number;
  region: string;
  lesson: LessonState | null;
  feynman: FeynmanState;
  debate: DebateState;
  engagement: EngagementState;
  accessibility: AccessibilityState;
  
  // Actions
  setUser: (user: UserProfile) => void;
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
}

export const useMainStore = create<MainStore>((set) => ({
  user: {
    id: "student_1",
    role: "student",
    name: "Aarav Sharma",
    streak: 5,
    xp: 1250,
    level: 4,
    badges: ["Language Pioneer", "Feynman Scholar", "Debate Champion"],
    completedLessons: ["photosynthesis-1", "solar-system-1"],
    streakLogs: [1, 1, 1, 1, 1],
    subjectProgress: {
      Science: 75,
      History: 40,
      Geography: 60,
      Mathematics: 25
    }
  },
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
  })
}));
