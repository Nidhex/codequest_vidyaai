import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMainStore } from '../store/mainStore';
import { TRANSLATIONS, LANGUAGES } from '../store/translations';
import { CURRICULUM_FALLBACK } from '../store/curriculumFallback';
import {
  ArrowLeft, Mic, RefreshCw, ClipboardList,
  ChevronDown, ChevronLeft, ChevronRight, Play,
  CheckCircle2, XCircle, Eye, EyeOff, Trophy
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { EngagementTracker } from '../components/EngagementTracker';
import { PomodoroTimer } from '../components/PomodoroTimer';

interface PracticeQuestionsProps {
  onNavigate: (page: string) => void;
}

interface Question {
  questionNumber: number;
  question: string;
  options: string[];          // A, B, C, D
  correctOption: string;      // 'A' | 'B' | 'C' | 'D'
  explanation: string;
  type: 'mcq' | 'short';
}

type BoardState = 'idle' | 'loading' | 'quiz';

export const PracticeQuestions: React.FC<PracticeQuestionsProps> = ({ onNavigate }) => {
  const { language, setLanguage, classLevel, setClassLevel, updateXP, engagement, updateEngagement } = useMainStore();

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

  // ── Speech recognition ──────────────────────────────────────────
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

  // ── Fetch questions ─────────────────────────────────────────────
  const fetchQuestions = async () => {
    setBoardState('loading');
    setQuestions([]); setCurrentQ(0); setShowAnswer(false);
    setSelectedOption(null); setScore(0); setAnswered(new Set());

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
          numQuestions
        })
      });
      clearTimeout(tid);
      const data = await res.json();
      if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
        setQuestions(data.questions);
        setBoardState('quiz');
        setLanguage(selectedLanguage);
        setClassLevel(gradeLevel);
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
      updateXP(totalXp);

      // Boost focus score in engagement tracker
      updateEngagement(100, 0.28, false);

      // Show XP toast
      const labels = ['Brilliant! 🌟 Focus Boosted!', 'Correct! 💪 Peak Focus!', 'Nailed it! 🚀 100% Attention!', 'Perfect! ✨ Focus Gained!', 'Awesome! 🔥 Eye-on-Board!'];
      setXpToast({ show: true, amount: totalXp, label: labels[Math.floor(Math.random() * labels.length)] });
      setTimeout(() => setXpToast({ show: false, amount: 0, label: '' }), 2500);

      // Confetti burst — more particles for harder difficulty
      const particles = difficulty === 'hard' ? 100 : difficulty === 'medium' ? 60 : 35;
      confetti({ particleCount: particles, spread: 65, colors: ['#22c55e', '#86efac', '#00f2fe', '#9b5de5'], origin: { y: 0.55 }, startVelocity: 30 });
      if (difficulty === 'hard') {
        setTimeout(() => confetti({ particleCount: 40, angle: 120, spread: 40, colors: ['#ffd700', '#ff6b6b'], origin: { x: 0, y: 0.6 } }), 200);
        setTimeout(() => confetti({ particleCount: 40, angle: 60, spread: 40, colors: ['#ffd700', '#ff6b6b'], origin: { x: 1, y: 0.6 } }), 400);
      }
    } else {
      // Wrong answer: shake the board
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
      setSelectedOption(null);
      setIsAnimating(false);
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

  const handleReset = () => { setQuestions([]); setCurrentQ(0); setShowAnswer(false); setSelectedOption(null); setScore(0); setAnswered(new Set()); setBoardState('idle'); };

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
              <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-2">Questions</p>
              <div className="grid grid-cols-4 gap-1.5">
                {questions.map((_, i) => (
                  <button key={i} onClick={() => goToQ(i, i > currentQ ? 'left' : 'right')}
                    className={`aspect-square rounded-xl text-[10px] font-bold transition-all border cursor-pointer ${
                      i === currentQ ? 'bg-[#0d2a1d] text-green-300 border-green-600/40' :
                      answered.has(i)
                        ? (questions[i].correctOption === (questions[i].options.find((o,oi) => o === questions[i].options[oi] && o[0] === questions[i].correctOption)?.[0])
                            ? 'bg-green-50 text-green-600 border-green-200'
                            : 'bg-slate-50 text-slate-500 border-slate-200')
                        : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-300'
                    }`}>
                    {i + 1}
                  </button>
                ))}
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
                <span className="text-[9px] font-mono font-bold text-green-300 uppercase tracking-widest">
                  {isLoading  ? 'AI is generating questions...' :
                   isQuiz    ? `Practice Zone · ${langObj?.name} · Class ${gradeLevel} · ${subject}` :
                   'VIDYA AI — Practice Zone'}
                </span>
              </div>
              {isQuiz && (
                <span className="text-[9px] font-mono text-white/40">
                  {answered.size}/{totalQ} answered · ← → navigate
                </span>
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
                        className="flex gap-2 cursor-pointer hover:text-green-300 transition-colors">
                        <span>→</span><span>{tp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* LOADING */}
              {boardState === 'loading' && (
                <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8">
                  <div className="relative">
                    <div className="w-14 h-14 border-4 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
                    <div className="absolute inset-2 w-9 h-9 border-4 border-white/10 border-b-white/40 rounded-full animate-spin" style={{ animationDirection:'reverse', animationDuration:'0.7s' }} />
                  </div>
                  <div className="text-center">
                    <p className="text-green-300 font-bold text-lg animate-pulse font-['Caveat',cursive]">Writing questions on board...</p>
                    <p className="text-white/40 text-xs font-mono mt-1">{subject} · Class {gradeLevel} · {topicInput}</p>
                  </div>
                  <div className="w-full max-w-sm space-y-2 opacity-20">
                    {['Q1.', 'Q2.', 'Q3.', 'Q4.', 'Q5.'].map((q,i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <span className="text-white/60 text-xs font-mono">{q}</span>
                        <div className="h-1.5 bg-white/50 rounded animate-pulse flex-1" style={{ animationDelay:`${i*0.2}s` }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* QUIZ — question card */}
              {boardState === 'quiz' && q && (
                <div
                  key={currentQ}
                  className="flex-1 flex flex-col p-7 gap-4 font-['Caveat',cursive]"
                  style={{
                    transition: 'opacity 0.28s ease, transform 0.28s ease',
                    opacity: isAnimating ? 0 : 1,
                    transform: isAnimating ? 'translateX(20px)' : 'translateX(0)'
                  }}
                >
                  {/* Question header */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-600/30 border border-green-400/30 flex items-center justify-center shrink-0">
                      <span className="text-green-300 font-black text-sm font-mono">{q.questionNumber}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-green-300 uppercase tracking-widest font-mono font-bold">
                        Question {q.questionNumber} of {totalQ} · MCQ
                      </span>
                    </div>
                    {/* Status badge */}
                    {isAnswered && (
                      <div className="ml-auto flex items-center gap-1">
                        {selectedOption?.[0] === q.correctOption
                          ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                          : <XCircle className="w-5 h-5 text-red-400" />}
                      </div>
                    )}
                  </div>

                  {/* Question text */}
                  <div className="bg-white/5 border border-white/15 rounded-2xl p-5">
                    <p className="text-white text-xl leading-relaxed font-semibold">
                      {q.question}
                    </p>
                  </div>

                  {/* Options */}
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

                  {/* Show/Hide Answer */}
                  {!isAnswered && (
                    <button onClick={() => setShowAnswer(s => !s)}
                      className="flex items-center gap-1.5 text-[10px] font-mono text-white/40 hover:text-white/70 transition-colors w-fit">
                      {showAnswer ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {showAnswer ? 'Hide Answer' : 'Peek at Answer'}
                    </button>
                  )}

                  {/* Explanation / Answer reveal */}
                  {(showAnswer || isAnswered) && q.explanation && (
                    <div className="bg-green-900/30 border border-green-500/30 rounded-xl px-5 py-4">
                      <p className="text-[9px] text-green-400 font-mono font-bold uppercase tracking-widest mb-1">
                        ✓ Correct Answer: Option {q.correctOption}
                      </p>
                      <p className="text-white/80 text-sm leading-relaxed">{q.explanation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* NAVIGATION BAR */}
            {isQuiz && questions.length > 0 && (
              <div className="border-t border-white/10 bg-black/20 px-6 py-4 flex items-center justify-between gap-4">
                <button onClick={() => goToQ(currentQ - 1, 'right')}
                  disabled={currentQ === 0 || isAnimating}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer font-mono text-xs font-bold uppercase tracking-wider">
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
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600/30 border border-green-500/40 text-green-300 hover:bg-green-600/50 disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer font-mono text-xs font-bold uppercase tracking-wider">
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
