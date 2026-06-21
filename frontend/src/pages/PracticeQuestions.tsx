import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMainStore } from '../store/mainStore';
import { TRANSLATIONS, LANGUAGES } from '../store/translations';
import { CURRICULUM_FALLBACK } from '../store/curriculumFallback';
import {
  ArrowLeft, Mic, RefreshCw, ClipboardList,
  ChevronDown, ChevronLeft, ChevronRight, Play,
  CheckCircle2, XCircle, Eye, EyeOff, Trophy,
  Clock, Flame, Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { EngagementTracker } from '../components/EngagementTracker';
import { PomodoroTimer } from '../components/PomodoroTimer';

const generateUuid = () => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    try {
      return window.crypto.randomUUID();
    } catch (e) {}
  }
  return 'quiz-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36);
};

interface PracticeQuestionsProps {
  onNavigate: (page: string) => void;
}

interface Question {
  questionNumber: number;
  question: string;
  options: string[];          // A, B, C, D
  correctOption: string;      // 'A' | 'B' | 'C' | 'D' or custom string for fill
  explanation: string;
  type: 'mcq' | 'tf' | 'fill' | 'ar';
  chapterReference?: string;
  quickRevisionNote?: string;
}

type BoardState = 'idle' | 'loading' | 'quiz';

export const PracticeQuestions: React.FC<PracticeQuestionsProps> = ({ onNavigate }) => {
  const { language, setLanguage, classLevel, setClassLevel, updateXP, engagement, updateEngagement, setUser } = useMainStore();

  // Curriculum
  const [gradeLevel, setGradeLevel] = useState(classLevel);
  const [subjectsList, setSubjectsList] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [chaptersList, setChaptersList] = useState<string[]>([]);
  const [chapter, setChapter] = useState('');
  const [topicsList, setTopicsList] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [topicInput, setTopicInput] = useState('Photosynthesis');

  // Board
  const [boardState, setBoardState] = useState<BoardState>('idle');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedOptionsMap, setSelectedOptionsMap] = useState<Record<number, string>>({});
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState<Set<number>>(new Set());
  const [isAnimating, setIsAnimating] = useState(false);
  const [xpToast, setXpToast] = useState<{ show: boolean; amount: number; label: string }>({ show: false, amount: 0, label: '' });
  const [shake, setShake] = useState(false);

  // Difficulty & count
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [numQuestions, setNumQuestions] = useState(8);

  // Voice
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Adaptive & state extensions
  const [sessionQuestionsHistory, setSessionQuestionsHistory] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [fillInput, setFillInput] = useState('');
  const [isAnsweringWithVoice, setIsAnsweringWithVoice] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingQuestionIndex, setLoadingQuestionIndex] = useState(1);
  const [sessionUuid, setSessionUuid] = useState<string>('');
  const [generationSource, setGenerationSource] = useState<string | null>(null);
  const [rejectionCount, setRejectionCount] = useState<number>(0);

  const timerRef = useRef<any>(null);
  const answeringRecognitionRef = useRef<any>(null);

  const classesList = ["1","2","3","4","5","6","7","8","9","10","11","12"];
  const difficultyConfig = {
    easy:   { label: 'Easy',   color: 'bg-emerald-100 border-emerald-400 text-emerald-700', active: 'bg-emerald-500 border-emerald-500 text-white' },
    medium: { label: 'Medium', color: 'bg-amber-100  border-amber-400  text-amber-700',   active: 'bg-amber-500  border-amber-500  text-white' },
    hard:   { label: 'Hard',   color: 'bg-rose-100   border-rose-400   text-rose-700',    active: 'bg-rose-500   border-rose-500   text-white' },
  };

  const q = questions[currentQ];
  const isAnswered = answered.has(currentQ);
  const langObj = LANGUAGES.find(l => l.code === selectedLanguage);

  // ── Curriculum loaders ──────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch(`http://localhost:5000/api/curriculum/subjects?classLevel=${gradeLevel}`);
        const d = await r.json();
        if (d.success && d.subjects?.length) { setSubjectsList(d.subjects); setSubject(d.subjects[0]); return; }
      } catch {}
      const fb = CURRICULUM_FALLBACK[String(gradeLevel)];
      const subs = fb ? Object.keys(fb.subjects) : ['Science', 'Mathematics'];
      setSubjectsList(subs); setSubject(subs[0] || '');
    };
    load();
  }, [gradeLevel]);

  useEffect(() => {
    if (!subject) return;
    const load = async () => {
      try {
        const r = await fetch(`http://localhost:5000/api/curriculum/chapters?classLevel=${gradeLevel}&subject=${encodeURIComponent(subject)}`);
        const d = await r.json();
        if (d.success && d.chapters?.length) { setChaptersList(d.chapters); setChapter(d.chapters[0]); return; }
      } catch {}
      const fb = CURRICULUM_FALLBACK[String(gradeLevel)];
      const chs = fb?.subjects[subject] ? Object.keys(fb.subjects[subject].chapters) : ['Chapter 1'];
      setChaptersList(chs); setChapter(chs[0] || '');
    };
    load();
  }, [gradeLevel, subject]);

  useEffect(() => {
    if (!chapter || !subject) return;
    const load = async () => {
      try {
        const r = await fetch(`http://localhost:5000/api/curriculum/topics?classLevel=${gradeLevel}&subject=${encodeURIComponent(subject)}&chapter=${encodeURIComponent(chapter)}`);
        const d = await r.json();
        if (d.success && d.topics?.length) { setTopicsList(d.topics); setSelectedTopic(d.topics[0]); setTopicInput(d.topics[0]); return; }
      } catch {}
      const fb = CURRICULUM_FALLBACK[String(gradeLevel)];
      const tops = fb?.subjects[subject]?.chapters[chapter] || ['Core Theory', 'Key Applications'];
      setTopicsList(tops); setSelectedTopic(tops[0] || ''); setTopicInput(tops[0] || '');
    };
    load();
  }, [gradeLevel, subject, chapter]);

  // ── Speech recognition (Topic input) ──────────────────────────────────────────
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false; rec.interimResults = false;
    const codes: Record<string,string> = { en:'en-IN', hi:'hi-IN', bn:'bn-IN', ta:'ta-IN', te:'te-IN', mr:'mr-IN', gu:'gu-IN', kn:'kn-IN', ml:'ml-IN', pa:'pa-IN', ur:'ur-PK' };
    rec.lang = codes[selectedLanguage] || 'en-IN';
    rec.onresult = (e: any) => setTopicInput(e.results[0][0].transcript.replace(/[.+]/g, ''));
    rec.onerror = () => setIsListening(false);
    rec.onend   = () => setIsListening(false);
    recognitionRef.current = rec;
  }, [selectedLanguage]);

  const toggleMic = () => {
    if (!recognitionRef.current) { alert('Speech recognition not supported.'); return; }
    if (isListening) { recognitionRef.current.stop(); }
    else { setIsListening(true); try { recognitionRef.current.start(); } catch {} }
  };

  // ── Speech recognition (Answering) ──────────────────────────────────────────
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    const codes: Record<string,string> = { en:'en-IN', hi:'hi-IN', bn:'bn-IN', ta:'ta-IN', te:'te-IN', mr:'mr-IN', gu:'gu-IN', kn:'kn-IN', ml:'ml-IN', pa:'pa-IN', ur:'ur-PK' };
    rec.lang = codes[selectedLanguage] || 'en-IN';
    
    rec.onresult = (e: any) => {
      const speechText = e.results[0][0].transcript.trim();
      handleSpeechAnswer(speechText);
    };
    rec.onerror = () => setIsAnsweringWithVoice(false);
    rec.onend   = () => setIsAnsweringWithVoice(false);
    answeringRecognitionRef.current = rec;
  }, [selectedLanguage, currentQ, questions]);

  const toggleAnsweringVoice = () => {
    if (!answeringRecognitionRef.current) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    if (isAnsweringWithVoice) {
      answeringRecognitionRef.current.stop();
    } else {
      setIsAnsweringWithVoice(true);
      try {
        answeringRecognitionRef.current.start();
      } catch {}
    }
  };

  const handleSpeechAnswer = (speechText: string) => {
    setIsAnsweringWithVoice(false);
    if (!q || isAnswered) return;

    const lowerSpeech = speechText.toLowerCase().trim();

    if (q.type === 'fill') {
      const cleaned = speechText.replace(/[.+]/g, '').trim();
      setFillInput(cleaned);
      return;
    }

    // MCQ / AR / TF options check
    const letterMap: Record<string, string> = {
      'a': 'A', 'option a': 'A', 'select a': 'A', 'first': 'A', 'one': 'A', 'ए': 'A', 'अ': 'A',
      'b': 'B', 'option b': 'B', 'select b': 'B', 'second': 'B', 'two': 'B', 'बी': 'B', 'ब': 'B',
      'c': 'C', 'option c': 'C', 'select c': 'C', 'third': 'C', 'three': 'C', 'सी': 'C', 'स': 'C',
      'd': 'D', 'option d': 'D', 'select d': 'D', 'fourth': 'D', 'four': 'D', 'डी': 'D', 'द': 'D',
      'true': 'A', 'सही': 'A', 'सत्य': 'A', 'yes': 'A', 'हाँ': 'A',
      'false': 'B', 'गलत': 'B', 'असत्य': 'B', 'no': 'B', 'नहीं': 'B'
    };

    const matchedLetter = letterMap[lowerSpeech];
    if (matchedLetter) {
      const option = q.options.find(opt => opt.trim().toUpperCase().startsWith(matchedLetter));
      if (option) {
        handleAnswer(option);
        return;
      }
    }

    // Try fuzzy text matching inside option contents
    for (const opt of q.options) {
      const optBody = opt.replace(/^[A-D]\)\s*/i, '').toLowerCase().trim();
      if (optBody.includes(lowerSpeech) || lowerSpeech.includes(optBody)) {
        handleAnswer(opt);
        return;
      }
    }
  };

  // ── Countdown Timer ──────────────────────────────────────────
  useEffect(() => {
    if (boardState !== 'quiz' || !q || isAnswered) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const limit = difficulty === 'hard' ? 60 : difficulty === 'medium' ? 45 : 30;
    setTimeLeft(limit);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [boardState, currentQ, difficulty, isAnswered]);

  const handleTimeOut = () => {
    if (isAnswered || !q) return;

    setStreak(0);

    const newAnswered = new Set(answered);
    newAnswered.add(currentQ);
    setAnswered(newAnswered);

    setSelectedOption('');
    setShowAnswer(true);

    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  // ── Loading step simulation ───────────────────────────────────
  const loadingSteps = [
    "🧼 Wiping the blackboard clean...",
    "📖 Analyzing CBSE & NCERT syllabus directives...",
    "🧠 Formulating questions matching curriculum expectations...",
    "✍️ Chalk-writing questions & correct keys to board...",
    "✨ Translation & rendering complete. Let's begin!"
  ];

  useEffect(() => {
    if (boardState !== 'loading') {
      setLoadingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStep(prev => {
        if (prev < loadingSteps.length - 1) return prev + 1;
        return prev;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [boardState]);

  useEffect(() => {
    if (boardState !== 'loading') {
      setLoadingQuestionIndex(1);
      return;
    }
    const stepDelay = Math.max(250, Math.floor(5000 / numQuestions));
    const interval = setInterval(() => {
      setLoadingQuestionIndex(prev => {
        if (prev < numQuestions) return prev + 1;
        return prev;
      });
    }, stepDelay);
    return () => clearInterval(interval);
  }, [boardState, numQuestions]);

  // ── Fetch questions ─────────────────────────────────────────────
  const fetchQuestions = async () => {
    setBoardState('loading');
    setQuestions([]); setCurrentQ(0); setShowAnswer(false);
    setSelectedOption(null); setSelectedOptionsMap({}); setScore(0); setAnswered(new Set()); setStreak(0);
    setGenerationSource(null); setRejectionCount(0);

    const newSessionUuid = generateUuid();
    setSessionUuid(newSessionUuid);

    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 16000);
      const res = await fetch('http://localhost:5000/api/learning/practice/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          topic: topicInput.trim(),
          classLevel: gradeLevel,
          language: selectedLanguage,
          subject,
          chapter,
          difficulty,
          numQuestions,
          questionCount: numQuestions,
          previousQuestions: sessionQuestionsHistory,
          sessionUuid: newSessionUuid
        })
      });
      clearTimeout(tid);
      const data = await res.json();
      if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
        setQuestions(data.questions);
        setGenerationSource(data.provider || 'AI');
        setRejectionCount(data.rejections || 0);
        setBoardState('quiz');
        setLanguage(selectedLanguage);
        setClassLevel(gradeLevel);

        // Add to history to ensure we don't repeat them
        const newQs = data.questions.map((qItem: any) => qItem.question);
        setSessionQuestionsHistory(prev => {
          const combined = [...prev, ...newQs];
          return Array.from(new Set(combined)).slice(-50);
        });

        // Initialize first timer
        const limit = difficulty === 'hard' ? 60 : difficulty === 'medium' ? 45 : 30;
        setTimeLeft(limit);
      } else throw new Error('No questions returned');
    } catch (err) {
      console.error('Practice questions fetch error:', err);
      setBoardState('idle');
    }
  };

  const handleStartQuiz = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topicInput.trim()) return;
    fetchQuestions();
  };

  // ── Answer handling ─────────────────────────────────────────────
  const handleAnswer = (option: string) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setSelectedOptionsMap(prev => ({ ...prev, [currentQ]: option }));
    setShowAnswer(true);
    const newAnswered = new Set(answered);
    newAnswered.add(currentQ);
    setAnswered(newAnswered);
    const letter = option[0]; // 'A', 'B', etc.
    if (q && letter === q.correctOption) {
      // XP scales with difficulty
      const xpMap: Record<string, number> = { easy: 5, medium: 10, hard: 20 };
      const xp = xpMap[difficulty] ?? 10;
      const totalXp = xp + 30;
      setScore(prev => prev + 1);
      setStreak(prev => prev + 1);
      updateXP(totalXp);

      // Boost focus score in engagement tracker
      updateEngagement(100, 0.28, false);

      // Show XP toast
      const labels = ['Brilliant! 🌟 Focus Boosted!', 'Correct! 💪 Peak Focus!', 'Nailed it! 🚀 100% Attention!', 'Perfect! ✨ Focus Gained!', 'Awesome! 🔥 Eye-on-Board!'];
      setXpToast({ show: true, amount: totalXp, label: `${labels[Math.floor(Math.random() * labels.length)]} Flame: ${streak + 1} 🔥` });
      setTimeout(() => setXpToast({ show: false, amount: 0, label: '' }), 2500);

      // Confetti burst — more particles for harder difficulty
      const particles = difficulty === 'hard' ? 100 : difficulty === 'medium' ? 60 : 35;
      confetti({ particleCount: particles, spread: 65, colors: ['#22c55e', '#86efac', '#00f2fe', '#9b5de5'], origin: { y: 0.55 }, startVelocity: 30 });
      if (difficulty === 'hard') {
        setTimeout(() => confetti({ particleCount: 40, angle: 120, spread: 40, colors: ['#ffd700', '#ff6b6b'], origin: { x: 0, y: 0.6 } }), 200);
        setTimeout(() => confetti({ particleCount: 40, angle: 60, spread: 40, colors: ['#ffd700', '#ff6b6b'], origin: { x: 1, y: 0.6 } }), 400);
      }
    } else {
      // Wrong answer: shake the board and reset streak
      setStreak(0);
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  const handleFillSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isAnswered || !q || !fillInput.trim()) return;

    const userAns = fillInput.trim().toLowerCase();
    const correctAns = q.correctOption.trim().toLowerCase();
    const isCorrect = userAns === correctAns;

    setSelectedOption(fillInput);
    setSelectedOptionsMap(prev => ({ ...prev, [currentQ]: fillInput }));
    setShowAnswer(true);
    const newAnswered = new Set(answered);
    newAnswered.add(currentQ);
    setAnswered(newAnswered);

    if (isCorrect) {
      setStreak(prev => prev + 1);
      const xpMap: Record<string, number> = { easy: 5, medium: 10, hard: 20 };
      const xp = xpMap[difficulty] ?? 10;
      const totalXp = xp + 30;
      setScore(prev => prev + 1);
      updateXP(totalXp);
      updateEngagement(100, 0.28, false);

      const labels = ['Brilliant! 🌟 Focus Boosted!', 'Correct! 💪 Peak Focus!', 'Nailed it! 🚀 100% Attention!'];
      setXpToast({ show: true, amount: totalXp, label: `${labels[Math.floor(Math.random() * labels.length)]} Flame: ${streak + 1} 🔥` });
      setTimeout(() => setXpToast({ show: false, amount: 0, label: '' }), 2500);

      confetti({ particleCount: 60, spread: 60 });
    } else {
      setStreak(0);
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  const goToQ = (idx: number, dir: 'left'|'right') => {
    if (isAnimating || idx < 0 || idx >= questions.length) return;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentQ(idx);
      setShowAnswer(answered.has(idx));
      setSelectedOption(selectedOptionsMap[idx] || null);
      setFillInput(questions[idx]?.type === 'fill' ? selectedOptionsMap[idx] || '' : '');
      setIsAnimating(false);

      // Reset timer if not answered
      if (!answered.has(idx)) {
        const limit = difficulty === 'hard' ? 60 : difficulty === 'medium' ? 45 : 30;
        setTimeLeft(limit);
      }
    }, 280);
  };

  // ── Keyboard nav ────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (boardState !== 'quiz') return;
      if (e.key === 'ArrowRight') goToQ(currentQ + 1, 'left');
      if (e.key === 'ArrowLeft')  goToQ(currentQ - 1, 'right');
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [boardState, currentQ, questions, isAnimating, answered]);

  // ── Log Quiz Activity to Backend ────────────────────────────────
  useEffect(() => {
    if (boardState === 'quiz' && questions.length > 0 && answered.size === questions.length) {
      const logQuizSession = async () => {
        try {
          let correctCount = 0;
          questions.forEach((qItem, i) => {
            const userSelection = selectedOptionsMap[i];
            const isCorrect = qItem.type === 'fill'
              ? userSelection?.trim().toLowerCase() === qItem.correctOption.trim().toLowerCase()
              : userSelection?.[0] === qItem.correctOption;
            if (isCorrect) correctCount++;
          });
          const scorePercent = Math.round((correctCount / questions.length) * 100);
          
          const response = await fetch('http://localhost:5000/api/learning/activity/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: 'student_1',
              activityType: 'quiz',
              subject: subject || 'Science',
              chapter: chapter || '',
              topic: topicInput,
              timeSpent: Math.round(questions.length * 1.5),
              score: scorePercent,
              totalQuestions: questions.length,
              correctAnswers: correctCount,
              wrongAnswers: questions.length - correctCount
            })
          });
          const resData = await response.json();
          if (resData.success && resData.user) {
            setUser(resData.user);
          }
        } catch (err) {
          console.error('Failed to log practice quiz activity:', err);
        }
      };
      logQuizSession();
    }
  }, [answered, boardState, questions, selectedOptionsMap, subject, chapter, topicInput, setUser]);

  const handleReset = () => {
    setQuestions([]);
    setCurrentQ(0);
    setShowAnswer(false);
    setSelectedOption(null);
    setSelectedOptionsMap({});
    setScore(0);
    setAnswered(new Set());
    setBoardState('idle');
    setStreak(0);
    setTimeLeft(30);
    setFillInput('');
    setSessionQuestionsHistory([]);
    setGenerationSource(null);
    setRejectionCount(0);
    setSessionUuid('');
  };

  const isLoading = boardState === 'loading';
  const isQuiz    = boardState === 'quiz';
  const totalQ    = questions.length;
  const pct       = totalQ > 0 ? Math.round((answered.size / totalQ) * 100) : 0;

  // Option color
  const getOptionStyle = (optionLetter: string, optionFull: string) => {
    if (!isAnswered) return 'bg-white/5 border-white/20 text-white/85 hover:bg-white/10 hover:border-green-400/50 cursor-pointer';
    if (optionLetter === q?.correctOption) return 'bg-green-600/30 border-green-400 text-green-200 cursor-default';
    if (optionFull === selectedOption && optionLetter !== q?.correctOption) return 'bg-red-600/30 border-red-400 text-red-200 cursor-default';
    return 'bg-white/5 border-white/10 text-white/40 cursor-default';
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-5">

      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-cyber-border/20 pb-3 font-mono text-xs">
        <button onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-1.5 text-cyber-blue hover:text-cyan-400 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <span className="font-outfit font-black text-cyber-purple tracking-widest uppercase flex items-center gap-1.5 animate-pulse">
          <ClipboardList className="w-4 h-4" /> Practice Zone
        </span>
        <button onClick={handleReset}
          className="flex items-center gap-1 px-3 py-1 border border-cyber-border hover:border-white rounded-lg text-cyber-text/80 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>
      {/* XP Toast overlay */}
      {xpToast.show && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="bg-gradient-to-r from-green-500 to-emerald-400 text-white px-6 py-3 rounded-2xl font-bold text-base shadow-2xl flex items-center gap-3 animate-bounce border border-green-300">
            <span className="text-2xl">⭐</span>
            <div>
              <div className="text-lg font-black">+{xpToast.amount} XP</div>
              <div className="text-xs font-medium opacity-90">{xpToast.label}</div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* LEFT — INPUT PANEL & FOCUS COMPANIONS */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4">

          {/* Score card */}
          {isQuiz && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Score</span>
              </div>
              <div className="text-3xl font-black text-green-600">{score} <span className="text-base text-slate-400 font-normal">/ {answered.size}</span></div>
              {/* Progress bar */}
              <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[9px] text-slate-400 mt-1 font-mono">{pct}% complete · {totalQ - answered.size} remaining</p>
            </div>
          )}

          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <ClipboardList className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-outfit font-bold text-slate-800">Generate Practice Questions</h2>
          </div>

          <form onSubmit={handleStartQuiz} className="flex flex-col gap-3">

            {/* Class */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Class Level</label>
              <div className="relative">
                <select value={gradeLevel} onChange={e => setGradeLevel(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-700 focus:outline-none appearance-none cursor-pointer">
                  {classesList.map(c => <option key={c} value={Number(c)}>Class {c}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Language */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Language</label>
              <div className="relative">
                <select value={selectedLanguage} onChange={e => setSelectedLanguage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-700 focus:outline-none appearance-none cursor-pointer">
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Subject */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Subject</label>
              <div className="relative">
                <select value={subject} onChange={e => setSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-700 focus:outline-none appearance-none cursor-pointer">
                  {subjectsList.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Chapter */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Chapter</label>
              <div className="relative">
                <select value={chapter} onChange={e => setChapter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-700 focus:outline-none appearance-none cursor-pointer">
                  {chaptersList.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Topic dropdown */}
            {topicsList.length > 0 && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Chapter Topic</label>
                <div className="relative">
                  <select value={selectedTopic} onChange={e => { setSelectedTopic(e.target.value); setTopicInput(e.target.value); }}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-700 focus:outline-none appearance-none cursor-pointer">
                    {topicsList.map(tp => <option key={tp} value={tp}>{tp}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Topic text + mic */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Or type / edit topic</label>
              <div className="relative">
                <input type="text" value={topicInput} onChange={e => setTopicInput(e.target.value)}
                  placeholder="Type or speak a topic..."
                  className="w-full bg-slate-50 border border-slate-200 pl-3 pr-9 py-2 rounded-xl text-xs text-slate-700 focus:outline-none" />
                <button type="button" onClick={toggleMic}
                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full transition-all ${isListening ? 'text-rose-500 bg-rose-50 animate-pulse' : 'text-slate-400 hover:text-slate-700'}`}>
                  <Mic className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Difficulty Level */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Difficulty Level</label>
              <div className="flex gap-2">
                {(['easy', 'medium', 'hard'] as const).map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 py-2 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      difficulty === d ? difficultyConfig[d].active : difficultyConfig[d].color
                    }`}
                  >
                    {difficultyConfig[d].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Number of Questions */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Number of Questions</label>
                <span className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">{numQuestions} Qs</span>
              </div>
              <input
                type="range"
                min={5} max={20} step={1}
                value={numQuestions}
                onChange={e => setNumQuestions(Number(e.target.value))}
                className="w-full accent-slate-600 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                <span>5</span><span>10</span><span>15</span><span>20</span>
              </div>
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full py-3 rounded-xl bg-[#707a8a] hover:bg-[#5f6875] text-white font-inter font-semibold text-sm flex items-center justify-center gap-2 shadow cursor-pointer transition-all disabled:opacity-60 mt-1">
              {isLoading
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating {numQuestions} questions...</>
                : <><Play className="w-4 h-4" /> Generate {numQuestions} Questions</>}
            </button>
          </form>

          {/* Question list thumbnails */}
          {isQuiz && questions.length > 0 && (
            <div className="border-t border-slate-100 pt-3">
              <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-2 font-mono">Questions Overview</p>
              <div className="grid grid-cols-4 gap-1.5 font-mono">
                {questions.map((qItem, i) => {
                  const hasAnsweredQ = answered.has(i);
                  const userSelection = selectedOptionsMap[i];
                  const isCorrect = qItem.type === 'fill'
                    ? userSelection?.trim().toLowerCase() === qItem.correctOption.trim().toLowerCase()
                    : userSelection?.[0] === qItem.correctOption;

                  return (
                    <button key={i} onClick={() => goToQ(i, i > currentQ ? 'left' : 'right')}
                      className={`aspect-square rounded-xl text-[10px] font-bold transition-all border cursor-pointer ${
                        i === currentQ ? 'bg-[#0d2a1d] text-green-300 border-green-600/40' :
                        hasAnsweredQ
                          ? (isCorrect
                              ? 'bg-green-50 text-green-600 border-green-200'
                              : 'bg-rose-50 text-rose-500 border-rose-200')
                          : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-300'
                      }`}>
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          </div>

          {/* Focus Companion Widgets */}
          <div className="flex flex-col gap-5">
            <EngagementTracker />
            <PomodoroTimer inline={true} />
          </div>
        </div>

        {/* RIGHT — GREEN BOARD */}
        <div className="lg:col-span-8">
          <div className="w-full bg-[#0d2a1d] border-[12px] border-[#3d2c16] rounded-[2rem] min-h-[560px] flex flex-col relative overflow-hidden shadow-2xl">

            {/* Board top chrome */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isQuiz ? 'bg-green-400 animate-pulse' : isLoading ? 'bg-yellow-400 animate-pulse' : 'bg-white/20'}`} />
                <span className="text-[9px] font-mono font-bold text-green-300 uppercase tracking-widest flex flex-wrap items-center gap-2">
                  {isLoading  ? 'AI is generating questions...' :
                   isQuiz    ? `Practice Zone · ${langObj?.name} · Class ${gradeLevel} · ${subject}` :
                   'VIDYA AI — Practice Zone'}
                  {isQuiz && generationSource && (
                    <span className="text-[8px] font-mono text-emerald-300 bg-green-950/60 px-1.5 py-0.5 rounded border border-green-500/30 normal-case tracking-normal">
                      engine: {generationSource} {rejectionCount > 0 ? `| filtered: ${rejectionCount}` : ''}
                    </span>
                  )}
                </span>
              </div>
              
              {/* Timer & Streak & Navigation info */}
              {isQuiz && (
                <div className="flex items-center gap-4 text-[10px] font-mono text-white/40">
                  {/* Timer display */}
                  {!isAnswered && (
                    <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border font-bold ${
                      timeLeft <= 10 ? 'text-rose-400 border-rose-500/30 animate-pulse bg-rose-500/10' : 'text-amber-300 border-amber-500/20 bg-amber-500/5'
                    }`}>
                      <Clock className="w-3.5 h-3.5" />
                      <span>{timeLeft}s</span>
                    </span>
                  )}
                  {/* Streak display */}
                  {streak > 0 && (
                    <span className="flex items-center gap-1 text-orange-400 font-bold bg-orange-500/10 border border-orange-500/30 px-2 py-0.5 rounded-md animate-bounce">
                      <Flame className="w-3.5 h-3.5 fill-orange-400" />
                      <span>{streak} Streak!</span>
                    </span>
                  )}
                  <span>
                    {answered.size}/{totalQ} answered
                  </span>
                </div>
              )}
            </div>

            {/* Board surface */}
            <div className="flex-1 flex flex-col relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
                style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 34px,rgba(255,255,255,0.5) 35px)' }} />

              {/* IDLE */}
              {boardState === 'idle' && (
                <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center p-8 font-['Caveat',cursive]">
                  <div className="w-16 h-16 rounded-2xl bg-green-500/20 border border-green-400/30 flex items-center justify-center">
                    <ClipboardList className="w-8 h-8 text-green-400" />
                  </div>
                  <h2 className="text-white text-3xl font-extrabold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                    Practice Zone
                  </h2>
                  <p className="text-white/75 text-lg max-w-sm leading-relaxed">
                    Select your class, subject &amp; topic — then click <strong className="text-green-300">"Generate Questions"</strong> to start your practice!
                  </p>
                  <div className="text-left text-white/60 text-base max-w-xs w-full space-y-2 border-t border-white/10 pt-4">
                    <span className="font-bold text-white text-sm block mb-1">Try these topics:</span>
                    {['Photosynthesis','Laws of Motion','Agricultural Implements','Fractions','Mughal Empire'].map(tp => (
                      <div key={tp} onClick={() => setTopicInput(tp)}
                        className="flex gap-2 cursor-pointer hover:text-green-300 transition-colors font-sans text-sm">
                        <span>→</span><span>{tp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* LOADING */}
              {boardState === 'loading' && (
                <div className="flex-1 flex flex-col justify-center p-8 font-['Caveat',cursive] text-lg text-white/80 space-y-6 max-w-xl mx-auto w-full">
                  <div className="flex items-center gap-3 border-b border-white/10 pb-3 mb-2">
                    <div className="relative shrink-0">
                      <div className="w-8 h-8 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
                    </div>
                    <span className="text-xl font-bold tracking-wide text-green-300 uppercase font-mono">
                      Preparing Classroom Board...
                    </span>
                  </div>

                  <div className="space-y-4 font-sans text-sm">
                    {loadingSteps.map((step, idx) => {
                      const isActive = idx === loadingStep;
                      const isCompleted = idx < loadingStep;
                      return (
                        <div
                          key={idx}
                          className={`flex items-center gap-3 transition-opacity duration-500 ${
                            isActive ? 'opacity-100 text-white font-bold' :
                            isCompleted ? 'opacity-40 text-green-200' : 'opacity-10'
                          }`}
                        >
                          <span className="font-mono text-sm shrink-0">
                            {isCompleted ? '✓' : isActive ? '✍️' : '·'}
                          </span>
                          <span className={`${isActive ? 'animate-pulse font-outfit' : 'font-outfit'}`}>{step}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Progressive Question Generation Progress */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mt-2 font-sans">
                    <div className="flex justify-between items-center mb-1.5 text-xs font-mono text-green-300">
                      <span>Generating Question {loadingQuestionIndex} of {numQuestions}...</span>
                      <span>{Math.round((loadingQuestionIndex / numQuestions) * 100)}%</span>
                    </div>
                    <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden border border-white/5">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all duration-300"
                        style={{ width: `${(loadingQuestionIndex / numQuestions) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-white/10 text-xs font-mono text-white/30 flex items-center justify-between font-sans">
                    <span>Topic: {topicInput}</span>
                    <span>Grade: {gradeLevel} · Diff: {difficulty.toUpperCase()}</span>
                  </div>
                </div>
              )}

              {/* QUIZ — question card */}
              {boardState === 'quiz' && q && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQ}
                    initial={{ opacity: 0, x: 30 }}
                    animate={shake ? { opacity: 1, x: [-10, 10, -10, 10, 0], transition: { type: "spring", duration: 0.4 } } : { opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.25 }}
                    className="flex-1 flex flex-col p-7 gap-4 font-['Caveat',cursive]"
                  >
                    {/* Question header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="bg-green-500/10 border border-green-500/30 text-green-300 text-xs font-mono px-2 py-0.5 rounded-lg font-bold">
                          Q{q.questionNumber} of {totalQ}
                        </span>
                        <span className="text-xs font-mono text-white/40 uppercase tracking-wider">
                          · {q.type === 'ar' ? 'Assertion-Reason' : q.type === 'tf' ? 'True/False' : q.type === 'fill' ? 'Fill in the Blank' : 'Multiple Choice'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isAnswered && (
                          <span className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-full border ${
                            selectedOption !== null && (q.type === 'fill'
                              ? selectedOption.trim().toLowerCase() === q.correctOption.trim().toLowerCase()
                              : selectedOption[0] === q.correctOption)
                              ? 'bg-green-500/10 border-green-500/30 text-green-300'
                              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                          }`}>
                            {selectedOption !== null && (q.type === 'fill'
                              ? selectedOption.trim().toLowerCase() === q.correctOption.trim().toLowerCase()
                              : selectedOption[0] === q.correctOption)
                              ? 'CORRECT' : 'INCORRECT'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Question text */}
                    <div className="bg-white/5 border border-white/15 rounded-2xl p-5">
                      <p className="text-white text-2xl leading-relaxed font-semibold">
                        {q.question}
                      </p>
                    </div>

                    {/* Options / Answer Input based on type */}
                    {q.type === 'fill' ? (
                      <form onSubmit={handleFillSubmit} className="flex flex-col gap-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={fillInput}
                            onChange={e => setFillInput(e.target.value)}
                            disabled={isAnswered}
                            placeholder="Type your answer here..."
                            className="flex-1 bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-400 font-sans"
                          />
                          <button
                            type="button"
                            onClick={toggleAnsweringVoice}
                            disabled={isAnswered}
                            className={`px-4 py-3 rounded-xl border border-white/20 flex items-center justify-center transition-all ${
                              isAnsweringWithVoice ? 'bg-rose-500/25 border-rose-400 text-rose-300 animate-pulse' : 'bg-white/5 text-white/70 hover:bg-white/10'
                            }`}
                            title="Answer with Voice"
                          >
                            <Mic className="w-4 h-4" />
                          </button>
                        </div>
                        {!isAnswered && (
                          <button
                            type="submit"
                            className="w-full py-3 rounded-xl bg-green-600/30 hover:bg-green-600/50 border border-green-500/40 text-green-300 font-bold transition-all text-sm cursor-pointer"
                          >
                            Submit Answer
                          </button>
                        )}
                      </form>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {q.options.map((opt, oi) => {
                          const letter = opt[0]; // 'A', 'B', 'C', 'D'
                          return (
                            <button key={oi}
                              onClick={() => handleAnswer(opt)}
                              disabled={isAnswered}
                              className={`text-left px-4 py-3 rounded-xl border text-sm transition-all ${getOptionStyle(letter, opt)}`}>
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Voice helper instruction */}
                    {q.type !== 'fill' && !isAnswered && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={toggleAnsweringVoice}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 text-xs transition-all ${
                            isAnsweringWithVoice ? 'bg-rose-500/25 border-rose-400 text-rose-300 animate-pulse' : 'bg-white/5 text-white/50 hover:text-white/75'
                          }`}
                        >
                          <Mic className="w-3.5 h-3.5" />
                          <span>{isAnsweringWithVoice ? 'Listening...' : 'Answer with Voice'}</span>
                        </button>
                      </div>
                    )}

                    {/* Show/Hide Answer (Only when not answered) */}
                    {!isAnswered && (
                      <button onClick={() => setShowAnswer(s => !s)}
                        className="flex items-center gap-1.5 text-[10px] font-mono text-white/40 hover:text-white/70 transition-colors w-fit">
                        {showAnswer ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showAnswer ? 'Hide Answer' : 'Peek at Answer'}
                      </button>
                    )}

                    {/* Visual Explanation Card */}
                    {(showAnswer || isAnswered) && (
                      <div className="mt-4 flex flex-col gap-3 bg-green-950/20 border border-green-500/20 rounded-2xl p-4 font-sans">
                        {/* Title banner */}
                        <div className="flex items-center justify-between border-b border-green-500/20 pb-2">
                          <span className="text-xs font-mono font-bold text-green-400 uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Correct Answer: {q.type === 'fill' ? q.correctOption : `Option ${q.correctOption}`}
                          </span>
                          {q.chapterReference && (
                            <span className="text-[10px] font-mono text-green-300/80 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                              📖 {q.chapterReference}
                            </span>
                          )}
                        </div>
                        
                        {/* Explanation details */}
                        <div className="text-slate-200 text-sm leading-relaxed font-outfit">
                          {q.explanation}
                        </div>

                        {/* Quick Revision Card */}
                        {q.quickRevisionNote && (
                          <div className="mt-1 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex gap-2.5 items-start">
                            <div className="p-1 rounded-lg bg-amber-500/10 text-amber-300 shrink-0">
                              <Sparkles className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block font-mono">
                                Quick Exam Tip (Revision Note)
                              </span>
                              <p className="text-slate-300 text-xs font-outfit mt-0.5">
                                {q.quickRevisionNote}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            {/* NAVIGATION BAR */}
            {isQuiz && questions.length > 0 && (
              <div className="border-t border-white/10 bg-black/20 px-6 py-4 flex items-center justify-between gap-4 font-mono">
                <button onClick={() => goToQ(currentQ - 1, 'right')}
                  disabled={currentQ === 0 || isAnimating}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer text-xs font-bold uppercase tracking-wider">
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>

                {/* Dot indicators */}
                <div className="flex items-center gap-1.5 flex-1 justify-center">
                  {questions.map((_, i) => (
                    <button key={i} onClick={() => goToQ(i, i > currentQ ? 'left' : 'right')}
                      className={`rounded-full transition-all cursor-pointer ${
                        i === currentQ ? 'w-6 h-2.5 bg-green-400' :
                        answered.has(i) ? 'w-2.5 h-2.5 bg-green-700' : 'w-2.5 h-2.5 bg-white/20 hover:bg-white/40'
                      }`} />
                  ))}
                </div>

                <button onClick={() => goToQ(currentQ + 1, 'left')}
                  disabled={currentQ === questions.length - 1 || isAnimating}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600/30 border border-green-500/40 text-green-300 hover:bg-green-600/50 disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer text-xs font-bold uppercase tracking-wider">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
