import React, { useState, useEffect, useRef } from 'react';
import { useMainStore } from '../store/mainStore';
import { TRANSLATIONS } from '../store/translations';
import {
  ArrowLeft, CheckCircle2, XCircle, Volume2, Mic, MicOff,
  HelpCircle, Award, Sparkles, ChevronRight, RefreshCw, AlertCircle,
  Zap, Target, Brain, Trophy, PlayCircle, Settings2
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuizArenaProps {
  topic: string;
  subject?: string;
  chapter?: string;
  initialNumQuestions?: number;
  initialDifficulty?: 'easy' | 'medium' | 'hard';
  onNavigate: (page: string) => void;
}

interface Question {
  type: 'mcq' | 'tf' | 'fill';
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
}

type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; color: string; border: string; glow: string; desc: string; emoji: string }> = {
  easy: {
    label: 'Easy',
    color: 'text-green-400',
    border: 'border-green-500',
    glow: 'shadow-[0_0_20px_rgba(34,197,94,0.3)]',
    desc: 'Basic recall & definitions',
    emoji: '🌱'
  },
  medium: {
    label: 'Medium',
    color: 'text-yellow-400',
    border: 'border-yellow-500',
    glow: 'shadow-[0_0_20px_rgba(234,179,8,0.3)]',
    desc: 'Apply concepts & analyze',
    emoji: '⚡'
  },
  hard: {
    label: 'Hard',
    color: 'text-red-400',
    border: 'border-red-500',
    glow: 'shadow-[0_0_20px_rgba(239,68,68,0.3)]',
    desc: 'Critical thinking & synthesis',
    emoji: '🔥'
  }
};

const NUM_OPTIONS = [5, 10, 15, 20];

const LANG_CODES: Record<string, string> = {
  en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', ta: 'ta-IN',
  te: 'te-IN', mr: 'mr-IN', gu: 'gu-IN', kn: 'kn-IN',
  ml: 'ml-IN', pa: 'pa-IN', ur: 'ur-PK', or: 'or-IN'
};

export const QuizArena: React.FC<QuizArenaProps> = ({ 
  topic, 
  subject, 
  chapter, 
  initialNumQuestions, 
  initialDifficulty, 
  onNavigate 
}) => {
  const { language, classLevel, updateXP, setUser } = useMainStore();
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  // ── PRE-QUIZ SETUP STATE ──────────────────────────────────────────
  const [setupDone, setSetupDone] = useState(!!initialNumQuestions);
  const [numQuestions, setNumQuestions] = useState(initialNumQuestions || 10);
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty || 'medium');

  // ── QUIZ STATE ────────────────────────────────────────────────────
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [fillVal, setFillVal] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  // ── VOICE STATE ───────────────────────────────────────────────────
  const [isListening, setIsListening] = useState(false);
  const [voiceResult, setVoiceResult] = useState('');
  const recognitionRef = useRef<any>(null);

  // ── INITIAL LOAD EFFECT ───────────────────────────────────────────
  const initialFetchRef = useRef(false);
  useEffect(() => {
    if (initialNumQuestions && !initialFetchRef.current) {
      initialFetchRef.current = true;
      fetchQuiz(initialNumQuestions, initialDifficulty || 'medium');
    }
  }, [initialNumQuestions, initialDifficulty]);

  // ── FETCH QUIZ ────────────────────────────────────────────────────
  const fetchQuiz = async (nq: number = numQuestions, diff: Difficulty = difficulty) => {
    setLoading(true);
    setCompleted(false);
    setCurrentIdx(0);
    setScore(0);
    setSelectedOpt(null);
    setFillVal('');
    setIsAnswered(false);
    try {
      const res = await fetch('http://localhost:5000/api/learning/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          language,
          classLevel,
          subject: subject || 'Science',
          chapter: chapter || '',
          numQuestions: nq,
          difficulty: diff
        })
      });
      const data = await res.json();
      if (data.success && data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
      }
    } catch (err) {
      console.error('Quiz fetch failed:', err);
      setQuestions([
        {
          type: 'mcq',
          question: language === 'hi' ? `"${topic}" के बारे में सही उत्तर चुनें:` : `Which best describes "${topic}"?`,
          options: [
            subject || 'Science',
            'Physical Education',
            'Art & Craft',
            'Computer Science'
          ],
          answer: subject || 'Science',
          explanation: `"${topic}" is studied under ${subject || 'Science'} in Class ${classLevel}.`
        },
        {
          type: 'tf',
          question: language === 'hi'
            ? `"${topic}", कक्षा ${classLevel} के पाठ्यक्रम में शामिल है।`
            : `"${topic}" is part of Class ${classLevel} NCERT syllabus.`,
          options: ['True', 'False'],
          answer: 'True',
          explanation: `Yes, "${topic}" is covered in NCERT Class ${classLevel} ${subject || 'Science'}.`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ── SPEECH RECOGNITION ────────────────────────────────────────────
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = LANG_CODES[language] || 'en-IN';

      rec.onstart = () => { setIsListening(true); setVoiceResult(''); };
      rec.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        setVoiceResult(transcript);
        if (questions[currentIdx]?.type === 'fill') setFillVal(transcript);
      };
      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);
      recognitionRef.current = rec;
    }
  }, [language, questions, currentIdx]);

  // ── ANSWER CHECK ──────────────────────────────────────────────────
  const checkAnswer = () => {
    if (isAnswered) return;
    const currentQ = questions[currentIdx];
    let correct = false;

    if (currentQ.type === 'mcq' || currentQ.type === 'tf') {
      correct = selectedOpt === currentQ.answer;
    } else if (currentQ.type === 'fill') {
      const studentAns = fillVal.trim().toLowerCase();
      const targetAns = currentQ.answer.trim().toLowerCase();
      correct = studentAns.includes(targetAns) || targetAns.includes(studentAns);
    }

    setIsCorrect(correct);
    setIsAnswered(true);

    if (correct) {
      setScore(s => s + 1);
      confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#00f2fe', '#9b5de5'] });
      confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#00f2fe', '#9b5de5'] });
    }
  };

  const handleNext = () => {
    setSelectedOpt(null);
    setFillVal('');
    setVoiceResult('');
    setIsAnswered(false);

    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setCompleted(true);
      const earnedXP = Math.round((score / questions.length) * 200);
      updateXP(earnedXP);
      const passPercent = (score / questions.length) * 100;
      if (passPercent >= 70) {
        confetti({ particleCount: 200, spread: 90, origin: { y: 0.5 }, colors: ['#00f5d4', '#fee440', '#f15bb5'] });
      }
      
      // Log quiz complete to Engagement AI backend
      const logQuizCompletion = async () => {
        try {
          const passPercentVal = Math.round((score / questions.length) * 100);
          const response = await fetch('http://localhost:5000/api/learning/activity/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: 'student_1',
              activityType: 'quiz',
              subject: subject || 'Science',
              chapter: chapter || '',
              topic: topic,
              timeSpent: Math.round(questions.length * 1.5),
              score: passPercentVal,
              totalQuestions: questions.length,
              correctAnswers: score,
              wrongAnswers: questions.length - score
            })
          });
          const resData = await response.json();
          if (resData.success && resData.user) {
            setUser(resData.user);
          }
        } catch (err) {
          console.error("Failed to log quiz complete:", err);
        }
      };
      logQuizCompletion();
    }
  };

  const handleStartQuiz = () => {
    setSetupDone(true);
    fetchQuiz(numQuestions, difficulty);
  };

  const handleRestart = () => {
    setSetupDone(false);
    setQuestions([]);
    setCompleted(false);
    setCurrentIdx(0);
    setScore(0);
  };

  const diffConfig = DIFFICULTY_CONFIG[difficulty];

  // ══════════════════════════════════════════════════════════════════
  // ── PRE-QUIZ SETUP SCREEN ─────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════
  if (!setupDone) {
    return (
      <div className="w-full min-h-screen max-w-3xl mx-auto px-4 py-8 flex flex-col space-y-6">

        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-cyber-border/20 pb-4 font-mono text-xs">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center space-x-1.5 text-cyber-blue hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Lesson</span>
          </button>
          <span className="font-outfit font-black text-cyber-pink tracking-widest uppercase flex items-center gap-1.5 animate-pulse">
            <HelpCircle className="w-4 h-4" /> Quiz Setup
          </span>
          <span className="text-cyber-text/40 text-[10px]">{subject} • {chapter?.split(':')[0]}</span>
        </div>

        {/* HERO */}
        <div className="glass-panel rounded-2xl border border-cyber-border/40 p-6 text-center space-y-2 shadow-glass">
          <div className="text-4xl mb-2">🎯</div>
          <h1 className="font-outfit font-extrabold text-2xl text-white">Quiz Arena</h1>
          <p className="text-sm text-cyber-text/60 font-mono">
            Topic: <span className="text-cyber-cyan font-bold">{topic}</span>
          </p>
          <p className="text-xs text-cyber-text/40 font-mono">
            Class {classLevel} • {subject} • {language.toUpperCase()} Language
          </p>
        </div>

        {/* NUMBER OF QUESTIONS */}
        <div className="glass-panel rounded-2xl border border-cyber-border/40 p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-cyber-cyan" />
            <h2 className="font-outfit font-bold text-sm uppercase tracking-wider text-white">
              How many questions?
            </h2>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {NUM_OPTIONS.map(n => (
              <button
                key={n}
                onClick={() => setNumQuestions(n)}
                className={`
                  py-4 rounded-xl border-2 font-outfit font-black text-xl transition-all duration-200 cursor-pointer
                  ${numQuestions === n
                    ? 'border-cyber-blue bg-cyber-blue/20 text-cyber-blue shadow-glow-blue scale-105'
                    : 'border-cyber-border/40 bg-black/30 text-cyber-text/60 hover:border-cyber-blue/50 hover:text-white'
                  }
                `}
              >
                {n}
                <div className="text-[10px] font-mono font-normal mt-0.5 opacity-70">
                  {n <= 5 ? 'Quick' : n <= 10 ? 'Standard' : n <= 15 ? 'Full' : 'Marathon'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* DIFFICULTY LEVEL */}
        <div className="glass-panel rounded-2xl border border-cyber-border/40 p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-4 h-4 text-cyber-purple" />
            <h2 className="font-outfit font-bold text-sm uppercase tracking-wider text-white">
              Choose difficulty level
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(Object.entries(DIFFICULTY_CONFIG) as [Difficulty, typeof DIFFICULTY_CONFIG['easy']][]).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setDifficulty(key)}
                className={`
                  py-5 px-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all duration-200 cursor-pointer
                  ${difficulty === key
                    ? `${cfg.border} bg-black/40 ${cfg.glow} scale-105`
                    : 'border-cyber-border/40 bg-black/30 hover:border-cyber-border/80'
                  }
                `}
              >
                <span className="text-2xl">{cfg.emoji}</span>
                <span className={`font-outfit font-black text-sm ${difficulty === key ? cfg.color : 'text-cyber-text/60'}`}>
                  {cfg.label}
                </span>
                <span className="text-[10px] font-mono text-cyber-text/50 text-center leading-tight">
                  {cfg.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* SUMMARY PREVIEW */}
        <div className="glass-panel rounded-xl border border-cyber-border/30 p-4 flex items-center justify-between font-mono text-xs text-cyber-text/60">
          <div className="flex items-center gap-3">
            <Settings2 className="w-4 h-4 text-cyber-purple" />
            <span>
              <span className="text-white font-bold">{numQuestions}</span> questions •{' '}
              <span className={`font-bold ${diffConfig.color}`}>{diffConfig.label}</span> difficulty •{' '}
              <span className="text-cyber-cyan font-bold">{language.toUpperCase()}</span> language
            </span>
          </div>
          <span className="text-cyber-text/30">≈ {numQuestions * 1} min</span>
        </div>

        {/* START BUTTON */}
        <button
          onClick={handleStartQuiz}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyber-pink via-cyber-purple to-cyber-blue text-white font-outfit font-black text-base uppercase tracking-widest flex items-center justify-center gap-3 shadow-glow-purple hover:opacity-90 active:scale-98 transition-all duration-200 cursor-pointer"
        >
          <PlayCircle className="w-5 h-5" />
          Start Quiz Now
          <Zap className="w-5 h-5" />
        </button>

      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // ── LOADING STATE ─────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="w-full min-h-screen max-w-4xl mx-auto px-6 py-6 flex flex-col space-y-6">
        <div className="glass-panel p-12 rounded-2xl border border-cyber-border/40 text-center flex flex-col items-center justify-center space-y-6">
          <div className="w-16 h-16 border-4 border-cyber-pink border-t-transparent rounded-full animate-spin" />
          <div className="space-y-2">
            <p className="text-sm font-outfit font-bold text-cyber-pink">
              Generating {numQuestions} {DIFFICULTY_CONFIG[difficulty].label} questions...
            </p>
            <p className="text-xs font-mono text-cyber-text/40">
              Topic: {topic} • {language.toUpperCase()} Language • Class {classLevel}
            </p>
          </div>
          <div className="flex gap-1.5">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-cyber-pink animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // ── COMPLETED SCREEN ──────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════
  if (completed) {
    const pct = Math.round((score / (questions.length || 1)) * 100);
    const earned = Math.round((score / (questions.length || 1)) * 200);
    const grade = pct >= 90 ? 'S' : pct >= 75 ? 'A' : pct >= 60 ? 'B' : pct >= 40 ? 'C' : 'D';
    const gradeColor = pct >= 90 ? 'text-cyber-cyan' : pct >= 75 ? 'text-green-400' : pct >= 60 ? 'text-yellow-400' : pct >= 40 ? 'text-orange-400' : 'text-red-400';

    return (
      <div className="w-full min-h-screen max-w-4xl mx-auto px-6 py-6 flex flex-col space-y-6">
        <div className="glass-panel p-8 rounded-2xl border border-cyber-border/40 text-center flex flex-col items-center space-y-6 shadow-glass">

          {/* Grade Badge */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-cyber-yellow/20 to-cyber-pink/20 border-2 border-cyber-yellow/40 flex items-center justify-center shadow-glow-purple">
              <span className={`font-outfit font-black text-4xl ${gradeColor}`}>{grade}</span>
            </div>
            <span className="absolute -top-1 -right-1 text-2xl">
              {pct >= 70 ? '🏆' : pct >= 40 ? '📚' : '💪'}
            </span>
          </div>

          <div>
            <h1 className="font-outfit font-extrabold text-3xl text-white">
              {pct >= 70 ? 'Excellent Work!' : pct >= 40 ? 'Good Effort!' : 'Keep Practising!'}
            </h1>
            <p className="text-xs font-mono text-cyber-cyan mt-1">
              {topic} • {DIFFICULTY_CONFIG[difficulty].label} • Class {classLevel} • {language.toUpperCase()}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="bg-cyber-bg/50 px-6 py-4 rounded-xl border border-cyber-border/30 grid grid-cols-4 gap-4 text-center font-mono w-full">
            <div>
              <div className="text-[10px] text-cyber-text/50 uppercase">Score</div>
              <div className="text-2xl font-black text-cyber-pink mt-1">{score}/{questions.length}</div>
            </div>
            <div>
              <div className="text-[10px] text-cyber-text/50 uppercase">Accuracy</div>
              <div className={`text-2xl font-black mt-1 ${gradeColor}`}>{pct}%</div>
            </div>
            <div>
              <div className="text-[10px] text-cyber-text/50 uppercase">XP Earned</div>
              <div className="text-2xl font-black text-cyber-cyan mt-1">+{earned}</div>
            </div>
            <div>
              <div className="text-[10px] text-cyber-text/50 uppercase">Grade</div>
              <div className={`text-2xl font-black mt-1 ${gradeColor}`}>{grade}</div>
            </div>
          </div>

          {/* Difficulty badge */}
          <div className={`px-4 py-1.5 rounded-full border text-xs font-mono font-bold ${DIFFICULTY_CONFIG[difficulty].border} ${DIFFICULTY_CONFIG[difficulty].color} bg-black/30`}>
            {DIFFICULTY_CONFIG[difficulty].emoji} {DIFFICULTY_CONFIG[difficulty].label} Difficulty Completed
          </div>

          <div className="flex gap-4 flex-wrap justify-center">
            <button
              onClick={handleRestart}
              className="px-5 py-2.5 rounded-xl border border-cyber-border/60 hover:border-white text-xs font-mono font-bold text-cyber-text uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Settings2 className="w-4 h-4" /> Change Settings
            </button>
            <button
              onClick={() => fetchQuiz(numQuestions, difficulty)}
              className="px-5 py-2.5 rounded-xl border border-cyber-border/60 hover:border-cyber-purple text-xs font-mono font-bold text-cyber-purple uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <RefreshCw className="w-4 h-4" /> Retry Same
            </button>
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyber-blue to-cyber-purple hover:opacity-95 text-black font-outfit font-black text-xs uppercase tracking-widest flex items-center gap-1 shadow-glow-blue cursor-pointer"
            >
              <Trophy className="w-4 h-4" /> Claim Rewards
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // ── ACTIVE QUIZ SCREEN ────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════
  const currentQ = questions[currentIdx];
  const progress = ((currentIdx) / questions.length) * 100;

  return (
    <div className="w-full min-h-screen max-w-4xl mx-auto px-6 py-6 flex flex-col space-y-5">

      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-cyber-border/20 pb-4 font-mono text-xs">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center space-x-1.5 text-cyber-blue hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Arena</span>
        </button>

        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${DIFFICULTY_CONFIG[difficulty].border} ${DIFFICULTY_CONFIG[difficulty].color} bg-black/30`}>
            {DIFFICULTY_CONFIG[difficulty].emoji} {DIFFICULTY_CONFIG[difficulty].label}
          </span>
          <span className="font-outfit font-black text-cyber-pink tracking-widest uppercase flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4" /> {topic}
          </span>
        </div>

        <span className="text-cyber-cyan font-bold">
          {score} / {questions.length}
        </span>
      </div>

      {/* PROGRESS BAR */}
      <div className="w-full bg-cyber-bg/50 rounded-full h-1.5 border border-cyber-border/20">
        <div
          className="h-1.5 rounded-full bg-gradient-to-r from-cyber-pink to-cyber-purple transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* QUESTION CARD */}
      {currentQ && (
        <div className="glass-panel p-6 rounded-2xl border border-cyber-border/40 shadow-glass flex flex-col space-y-5 text-left">

          {/* Question header */}
          <div className="flex justify-between items-center text-[10px] font-mono text-cyber-text/50">
            <span>QUESTION {currentIdx + 1} OF {questions.length}</span>
            <span className="bg-cyber-purple/20 px-2 py-0.5 rounded text-cyber-purple border border-cyber-purple/30 uppercase">
              {currentQ.type === 'fill' ? 'Fill in Blank' : currentQ.type === 'tf' ? 'True / False' : 'Multiple Choice'}
            </span>
          </div>

          {/* Question text */}
          <h2 className="font-outfit font-extrabold text-xl text-white leading-snug">
            {currentQ.question}
          </h2>

          {/* ANSWER OPTIONS */}
          <div className="flex flex-col space-y-3 font-mono text-sm">

            {/* MCQ OPTIONS */}
            {currentQ.type === 'mcq' && currentQ.options && (
              <div className="grid grid-cols-1 gap-2.5">
                {currentQ.options.map((opt, i) => {
                  const isSelected = selectedOpt === opt;
                  const isCorrectAns = opt === currentQ.answer;
                  let cls = 'border-cyber-border/60 bg-black/30 hover:border-cyber-blue/60';
                  if (isSelected && !isAnswered) cls = 'border-cyber-blue bg-cyber-blue/10 text-cyber-blue';
                  if (isAnswered) {
                    if (isCorrectAns) cls = 'border-green-500 bg-green-500/10 text-green-400 font-bold';
                    else if (isSelected) cls = 'border-red-500 bg-red-500/10 text-red-400';
                  }
                  return (
                    <button
                      key={i}
                      disabled={isAnswered}
                      onClick={() => setSelectedOpt(opt)}
                      className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${cls}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-[10px] font-bold shrink-0">
                          {['A', 'B', 'C', 'D'][i]}
                        </span>
                        <span>{opt}</span>
                      </div>
                      {isAnswered && isCorrectAns && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                      {isAnswered && isSelected && !isCorrectAns && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* TRUE/FALSE */}
            {currentQ.type === 'tf' && (
              <div className="grid grid-cols-2 gap-3">
                {['True', 'False'].map((opt, i) => {
                  const isSelected = selectedOpt === opt;
                  const isCorrectAns = opt === currentQ.answer;
                  let cls = 'border-cyber-border/60 bg-black/30 hover:border-cyber-purple/60';
                  if (isSelected && !isAnswered) cls = 'border-cyber-purple bg-cyber-purple/10 text-cyber-purple';
                  if (isAnswered) {
                    if (isCorrectAns) cls = 'border-green-500 bg-green-500/10 text-green-400 font-bold';
                    else if (isSelected) cls = 'border-red-500 bg-red-500/10 text-red-400';
                  }
                  return (
                    <button
                      key={i}
                      disabled={isAnswered}
                      onClick={() => setSelectedOpt(opt)}
                      className={`p-5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${cls}`}
                    >
                      <span className="text-2xl">{opt === 'True' ? '✅' : '❌'}</span>
                      <span className="font-bold text-base">{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* FILL IN BLANK */}
            {currentQ.type === 'fill' && (
              <div className="flex flex-col space-y-3">
                <input
                  type="text"
                  disabled={isAnswered}
                  placeholder={language === 'hi' ? 'यहाँ टाइप करें या बोलें...' : 'Type or speak your answer here...'}
                  value={fillVal}
                  onChange={(e) => setFillVal(e.target.value)}
                  className="w-full bg-black/40 border border-cyber-border/80 p-3.5 rounded-xl text-sm focus:outline-none focus:border-cyber-blue text-white"
                />
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (isListening) recognitionRef.current?.stop();
                      else recognitionRef.current?.start();
                    }}
                    disabled={isAnswered}
                    className={`px-4 py-2.5 rounded-xl border text-xs font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer ${
                      isListening
                        ? 'bg-cyber-pink text-white border-cyber-pink animate-pulse'
                        : 'bg-cyber-bg border-cyber-border text-cyber-cyan hover:border-cyber-cyan'
                    }`}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    <span>{isListening ? 'Listening...' : 'Speak Answer'}</span>
                  </button>
                  {voiceResult && (
                    <span className="text-[10px] text-cyber-text/50 font-mono italic">
                      Captured: "{voiceResult}"
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* EXPLANATION */}
          {isAnswered && (
            <div className={`p-4 rounded-xl border flex flex-col space-y-1.5 font-mono text-xs ${
              isCorrect ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
            }`}>
              <span className={`font-bold flex items-center gap-1 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                {isCorrect ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {isCorrect ? '✓ Correct!' : `✗ Incorrect. Answer: ${currentQ.answer}`}
              </span>
              <p className="text-cyber-text/80 leading-relaxed mt-1">{currentQ.explanation}</p>
            </div>
          )}

          {/* BOTTOM BUTTONS */}
          <div className="pt-3 border-t border-cyber-border/20 flex justify-between items-center font-mono">
            <span className="text-[10px] text-cyber-text/30">
              {language.toUpperCase()} • {DIFFICULTY_CONFIG[difficulty].label}
            </span>
            {!isAnswered ? (
              <button
                onClick={checkAnswer}
                disabled={
                  (currentQ.type === 'mcq' && !selectedOpt) ||
                  (currentQ.type === 'tf' && !selectedOpt) ||
                  (currentQ.type === 'fill' && !fillVal.trim())
                }
                className="px-6 py-2.5 rounded-xl bg-cyber-blue disabled:opacity-40 text-black font-bold uppercase text-xs tracking-wider flex items-center gap-1 shadow-glow-blue cursor-pointer transition-all"
              >
                <span>{t.submit || 'Submit'}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyber-purple to-cyber-pink text-white font-bold uppercase text-xs tracking-wider flex items-center gap-1 shadow-glow-purple cursor-pointer transition-all"
              >
                <span>{currentIdx + 1 === questions.length ? '🏁 Finish Quiz' : `${t.next || 'Next'} →`}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* No questions fallback */}
      {!loading && questions.length === 0 && (
        <div className="glass-panel p-8 rounded-2xl border border-cyber-border/40 text-center text-cyber-text/60">
          No questions generated. <button onClick={handleRestart} className="text-cyber-blue underline">Try again</button>
        </div>
      )}

    </div>
  );
};
