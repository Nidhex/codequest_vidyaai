import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMainStore } from '../store/mainStore';
import { LANGUAGES } from '../store/translations';
import { CURRICULUM_FALLBACK } from '../store/curriculumFallback';
import {
  Presentation, Mic, Send, RefreshCw,
  Layers, Sliders, ChevronDown,
  Volume2, VolumeX, Zap, Play, RotateCcw, Info
} from 'lucide-react';
import confetti from 'canvas-confetti';


interface SmartBoardProps {
  onNavigate: (page: string) => void;
}

interface DiagramElement { label: string; desc: string; }
interface DiagramData { type: 'flowchart' | 'cycle' | 'hierarchy' | 'formula'; title: string; elements: DiagramElement[]; }
interface LessonData {
  title: string; explanation: string; keyPoints: string[];
  examples: string[]; diagram: DiagramData; summary: string;
}

type BoardState = 'idle' | 'loading' | 'teaching' | 'error';

const IDLE_LESSON: LessonData = {
  title: "VIDYA AI Smart Classroom",
  explanation: "Welcome! Select your class, language, subject, and topic on the left, then click 'Start Teaching'. Your AI teacher will instantly generate a complete lesson on the smart board and begin speaking in your chosen language.",
  keyPoints: [
    "Select any of 22 Indian languages — lessons will appear in that language",
    "The AI avatar will speak the lesson aloud automatically",
    "Ask follow-up questions after any lesson using text or voice"
  ],
  examples: [
    "Try: Class 8 → Hindi → Science → Crop Production → Agricultural Implements",
    "Try: Class 10 → Telugu → Mathematics → Real Numbers → Euclid's Division Lemma"
  ],
  diagram: {
    type: "flowchart", title: "How Smart Teaching Works",
    elements: [
      { label: "📚 Select Curriculum", desc: "Pick class, language, subject & topic" },
      { label: "🤖 AI Generates Lesson", desc: "Structured NCERT-aligned content appears" },
      { label: "🎙️ Avatar Speaks", desc: "AI teacher explains in your language" },
      { label: "💬 Ask Questions", desc: "Follow-up queries update the board live" }
    ]
  },
  summary: "Click 'Start Teaching' to begin your AI-powered lesson!"
};

// ─── Typewriter Hook ─────────────────────────────────────────────
function useTypewriter(text: string, speed = 12) {
  const [displayed, setDisplayed] = useState('');
  const rafRef = useRef<number>(0);

  useEffect(() => {
    setDisplayed('');
    if (!text) return;
    let i = 0;
    const tick = () => {
      if (i < text.length) {
        // Chunk by word for smoother feel
        const chunk = Math.min(3, text.length - i);
        setDisplayed(prev => prev + text.slice(i, i + chunk));
        i += chunk;
        rafRef.current = setTimeout(tick, speed) as any;
      }
    };
    tick();
    return () => clearTimeout(rafRef.current);
  }, [text, speed]);

  return displayed;
}

// ─── Avatar Component ─────────────────────────────────────────────
const AvatarTeacher: React.FC<{ isSpeaking: boolean; language: string }> = ({ isSpeaking, language }) => {
  const [mouthOpen, setMouthOpen] = useState(false);
  const [eyeBlink, setEyeBlink] = useState(false);

  useEffect(() => {
    if (!isSpeaking) { setMouthOpen(false); return; }
    const interval = setInterval(() => setMouthOpen(p => !p), 180 + Math.random() * 120);
    return () => clearInterval(interval);
  }, [isSpeaking]);

  useEffect(() => {
    const blink = setInterval(() => {
      setEyeBlink(true);
      setTimeout(() => setEyeBlink(false), 150);
    }, 2800 + Math.random() * 1200);
    return () => clearInterval(blink);
  }, []);

  const flagMap: Record<string, string> = {
    hi: '🇮🇳', en: '🌐', bn: '🇧🇩', ta: '🏛️', te: '🏛️',
    mr: '🇮🇳', gu: '🇮🇳', kn: '🏛️', ml: '🏛️', pa: '🇮🇳',
    ur: '🇵🇰', or: '🇮🇳', as: '🇮🇳'
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Avatar Circle */}
      <div className={`relative w-24 h-24 rounded-full border-4 transition-all duration-300 ${
        isSpeaking
          ? 'border-cyber-cyan shadow-[0_0_30px_rgba(0,242,254,0.6)] scale-105'
          : 'border-cyber-border/40 shadow-[0_0_10px_rgba(0,242,254,0.1)]'
      }`}
        style={{ background: 'radial-gradient(circle at 35% 35%, #1a2040, #0a0f25)' }}
      >
        {/* Face */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Eyes */}
          <div className="flex gap-4 mb-2">
            {[0, 1].map(i => (
              <div key={i} className={`w-3 h-3 rounded-full bg-cyber-cyan transition-all ${
                eyeBlink ? 'scaleY-[0.1]' : ''
              } ${isSpeaking ? 'shadow-[0_0_8px_rgba(0,242,254,0.8)]' : ''}`} />
            ))}
          </div>
          {/* Mouth */}
          <div className={`transition-all duration-100 ${
            mouthOpen
              ? 'w-7 h-4 rounded-b-full border-2 border-cyber-cyan bg-cyber-cyan/20 shadow-[0_0_6px_rgba(0,242,254,0.5)]'
              : 'w-6 h-1.5 rounded-full bg-cyber-cyan/60'
          }`} />
        </div>
        {/* Pulse ring when speaking */}
        {isSpeaking && (
          <div className="absolute inset-[-8px] rounded-full border-2 border-cyber-cyan/30 animate-ping" />
        )}
        {/* Language badge */}
        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-cyber-bg border border-cyber-border flex items-center justify-center text-sm">
          {flagMap[language] || '🌐'}
        </div>
      </div>

      {/* Status label */}
      <div className={`text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-full transition-all ${
        isSpeaking
          ? 'text-cyber-cyan bg-cyber-cyan/10 border border-cyber-cyan/30 animate-pulse'
          : 'text-cyber-text/40 bg-transparent'
      }`}>
        {isSpeaking ? '🎙 Speaking...' : 'VIDYA AI'}
      </div>
    </div>
  );
};

// ─── Main SmartBoard Component ────────────────────────────────────
export const SmartBoard: React.FC<SmartBoardProps> = ({ onNavigate }) => {
  const { language, setLanguage, classLevel, setClassLevel, updateXP, region } = useMainStore();

  // Curriculum state
  const [gradeLevel, setGradeLevel] = useState(classLevel);
  const [subjectsList, setSubjectsList] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [chaptersList, setChaptersList] = useState<string[]>([]);
  const [chapter, setChapter] = useState('');
  const [topicsList, setTopicsList] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [topicInput, setTopicInput] = useState('Photosynthesis');
  const [selectedLanguage, setSelectedLanguage] = useState(language);

  // Mode toggles
  const [simplify, setSimplify] = useState(false);
  const [visualMode, setVisualMode] = useState(true);
  const [examPrep, setExamPrep] = useState(false);
  const [skillLevel, setSkillLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');

  // Board state
  const [lesson, setLesson] = useState<LessonData>(IDLE_LESSON);
  const [boardState, setBoardState] = useState<BoardState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [provider, setProvider] = useState('');
  const [history, setHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [followUp, setFollowUp] = useState('');

  // TTS / voice
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isListeningFollowUp, setIsListeningFollowUp] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const recognitionRef = useRef<any>(null);
  const speakQueueRef = useRef<string>('');

  // Typewriter
  const typedExplanation = useTypewriter(
    boardState === 'teaching' ? lesson.explanation : '',
    8
  );

  const classesList = ["1","2","3","4","5","6","7","8","9","10","11","12"];

  // ─ Curriculum loaders ──────────────────────────────────────────
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
        if (d.success && d.topics?.length) {
          setTopicsList(d.topics); setSelectedTopic(d.topics[0]); setTopicInput(d.topics[0]); return;
        }
      } catch {}
      const fb = CURRICULUM_FALLBACK[String(gradeLevel)];
      const tops = fb?.subjects[subject]?.chapters[chapter] || ['Core Theory', 'Key Applications'];
      setTopicsList(tops); setSelectedTopic(tops[0] || ''); setTopicInput(tops[0] || '');
    };
    load();
  }, [gradeLevel, subject, chapter]);

  // ─ Speech recognition setup ────────────────────────────────────
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false; rec.interimResults = false;
    const langCodes: Record<string,string> = {
      en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', ta: 'ta-IN',
      te: 'te-IN', mr: 'mr-IN', gu: 'gu-IN', kn: 'kn-IN',
      ml: 'ml-IN', pa: 'pa-IN', ur: 'ur-PK', or: 'or-IN'
    };
    rec.lang = langCodes[selectedLanguage] || 'en-IN';
    rec.onresult = (e: any) => {
      const t = e.results[0][0].transcript;
      if (isListeningFollowUp) setFollowUp(t);
      else setTopicInput(t.replace(/[.+]/g, ''));
    };
    rec.onerror = () => { setIsListening(false); setIsListeningFollowUp(false); };
    rec.onend = () => { setIsListening(false); setIsListeningFollowUp(false); };
    recognitionRef.current = rec;
  }, [selectedLanguage, isListeningFollowUp]);

  const toggleMic = (isFollowUp: boolean) => {
    if (!recognitionRef.current) { alert('Speech recognition not supported in this browser.'); return; }
    if (isListening || isListeningFollowUp) {
      recognitionRef.current.stop(); setIsListening(false); setIsListeningFollowUp(false);
    } else {
      setIsListeningFollowUp(isFollowUp); setIsListening(!isFollowUp);
      try { recognitionRef.current.start(); } catch {}
    }
  };

  // ─ TTS ────────────────────────────────────────────────────────
  const speakText = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    if (!text || !autoSpeak) { setIsSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance(text);
    const lc: Record<string,string> = {
      en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', ta: 'ta-IN',
      te: 'te-IN', mr: 'mr-IN', gu: 'gu-IN', kn: 'kn-IN',
      ml: 'ml-IN', pa: 'pa-IN', ur: 'ur-PK', or: 'or-IN'
    };
    u.lang = lc[selectedLanguage] || 'en-IN';
    u.rate = 0.95; u.pitch = 1.05;
    u.onstart = () => setIsSpeaking(true);
    u.onend = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(u);
  }, [selectedLanguage, autoSpeak]);

  const stopSpeaking = () => { window.speechSynthesis.cancel(); setIsSpeaking(false); };

  // ─ Start Teaching ─────────────────────────────────────────────
  const handleStartTeaching = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const topic = topicInput.trim();
    if (!topic) return;

    stopSpeaking();
    setBoardState('loading');
    setErrorMsg('');
    setLanguage(selectedLanguage);
    setClassLevel(gradeLevel);

    try {
      const controller = new AbortController();
      // Cancel after 12s to prevent infinite hang
      const tid = setTimeout(() => controller.abort(), 12000);

      const response = await fetch('http://localhost:5000/api/learning/smart-board/teach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          topic, classLevel: gradeLevel, language: selectedLanguage,
          region, subject, chapter,
          modes: { simplify, visualMode, examPrep, skillLevel }
        })
      });
      clearTimeout(tid);

      const data = await response.json();

      if (data.success) {
        const newLesson: LessonData = {
          title: data.title || topic,
          explanation: data.explanation || `Lesson on ${topic} for Class ${gradeLevel}`,
          keyPoints: Array.isArray(data.keyPoints) && data.keyPoints.length > 0
            ? data.keyPoints
            : [`${topic} is a key concept in ${subject}`, `Class ${gradeLevel} NCERT curriculum`, 'Practice problems recommended'],
          examples: Array.isArray(data.examples) && data.examples.length > 0
            ? data.examples
            : [`Real-world example of ${topic}`, `${topic} in everyday life`],
          diagram: data.diagram && data.diagram.elements?.length > 0
            ? data.diagram
            : { type: 'flowchart', title: `${topic} — Concept Flow`, elements: [
                { label: 'Introduction', desc: `Basic understanding of ${topic}` },
                { label: 'Key Mechanism', desc: 'How it works step by step' },
                { label: 'Application', desc: 'Real-world uses and exam tips' }
              ]},
          summary: data.summary || `${topic} is an important concept in Class ${gradeLevel} ${subject}.`
        };

        setLesson(newLesson);
        setHistory([{ role: 'assistant', content: newLesson.explanation }]);
        setProvider(data.provider || 'ai');
        setBoardState('teaching');
        updateXP(20);

        confetti({ particleCount: 60, spread: 70, colors: ['#00f2fe', '#9b5de5', '#fee440'], origin: { y: 0.6 } });

        // Auto-speak the lesson after a short delay for animation to start
        if (autoSpeak) {
          setTimeout(() => {
            speakText(newLesson.title + '. ' + newLesson.explanation);
          }, 800);
        }
      } else {
        throw new Error('API returned success:false');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Timeout — show offline lesson
        const offlineLesson: LessonData = {
          title: `${topic} — Class ${gradeLevel} ${subject}`,
          explanation: `This is an AI-generated lesson on "${topic}" for Class ${gradeLevel} ${subject}. The topic covers fundamental concepts aligned with the NCERT curriculum. Key ideas include definitions, mechanisms, real-world applications, and practice examples. Students should focus on understanding the core principles and connecting them to daily life experiences in India.`,
          keyPoints: [
            `${topic} is a fundamental concept in Class ${gradeLevel} ${subject}`,
            `Important for NCERT board examinations and higher studies`,
            `Connect to real-life examples from your region for better understanding`
          ],
          examples: [
            `Example 1: How ${topic} appears in everyday life around you`,
            `Example 2: A classroom demonstration or experiment for ${topic}`
          ],
          diagram: { type: 'flowchart', title: `${topic} — Learning Flow`, elements: [
            { label: '📖 Concept Introduction', desc: `What is ${topic}?` },
            { label: '⚙️ Core Mechanism', desc: `How does ${topic} work?` },
            { label: '🌍 Real Applications', desc: `Where do we see ${topic}?` }
          ]},
          summary: `${topic} is a key topic in Class ${gradeLevel} ${subject} — understanding it builds a strong foundation for board exams.`
        };
        setLesson(offlineLesson);
        setProvider('offline');
        setBoardState('teaching');
        if (autoSpeak) {
          setTimeout(() => speakText(offlineLesson.title + '. ' + offlineLesson.explanation), 500);
        }
      } else {
        setBoardState('error');
        setErrorMsg('Could not reach the server. Please check your connection.');
      }
    }
  };

  // ─ Follow-up ──────────────────────────────────────────────────
  const handleFollowUp = async (queryText: string) => {
    const q = queryText || followUp;
    if (!q.trim() || boardState === 'loading') return;

    stopSpeaking();
    setFollowUp('');
    setBoardState('loading');

    const updatedHistory = [...history, { role: 'user' as const, content: q }];
    setHistory(updatedHistory);

    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 12000);

      const response = await fetch('http://localhost:5000/api/learning/smart-board/teach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          topic: topicInput, classLevel: gradeLevel, language: selectedLanguage,
          region, subject, chapter,
          modes: { simplify, visualMode, examPrep, skillLevel },
          followUpQuery: q, history: updatedHistory
        })
      });
      clearTimeout(tid);

      const data = await response.json();
      if (data.success) {
        const updated: LessonData = {
          title: data.title || lesson.title,
          explanation: data.explanation || lesson.explanation,
          keyPoints: data.keyPoints?.length ? data.keyPoints : lesson.keyPoints,
          examples: data.examples?.length ? data.examples : lesson.examples,
          diagram: data.diagram?.elements?.length ? data.diagram : lesson.diagram,
          summary: data.summary || lesson.summary
        };
        setLesson(updated);
        setHistory([...updatedHistory, { role: 'assistant', content: updated.explanation }]);
        setBoardState('teaching');
        updateXP(15);
        if (autoSpeak) {
          setTimeout(() => speakText(updated.explanation), 500);
        }
      } else {
        setBoardState('teaching');
      }
    } catch {
      setBoardState('teaching'); // Stay on current lesson on error
    }
  };

  const handleReset = () => {
    stopSpeaking();
    setLesson(IDLE_LESSON);
    setBoardState('idle');
    setHistory([]);
    setFollowUp('');
    setProvider('');
  };

  // ─ Diagram renderer ────────────────────────────────────────────
  const renderDiagram = (diag: DiagramData) => {
    if (!diag?.elements?.length) return null;
    const colors = { cycle: 'cyber-cyan', hierarchy: 'cyber-purple', formula: 'cyber-yellow', flowchart: 'cyber-pink' };
    const color = colors[diag.type] || 'cyber-cyan';

    if (diag.type === 'cycle') return (
      <div className="flex flex-col items-center py-3 gap-3">
        <span className={`text-[10px] text-${color} font-bold uppercase tracking-widest`}>🔄 {diag.title}</span>
        <div className="flex flex-wrap justify-center items-center gap-3">
          {diag.elements.map((el, i) => (
            <React.Fragment key={i}>
              <div className={`bg-cyber-bg/60 border border-${color}/30 rounded-xl p-3 max-w-[140px] text-center hover:border-${color} hover:scale-105 transition-all`}>
                <span className={`text-xs font-bold text-${color} block mb-0.5`}>{el.label}</span>
                <span className="text-[9px] text-cyber-text/60 leading-tight block">{el.desc}</span>
              </div>
              {i < diag.elements.length - 1 && <span className={`text-${color} animate-pulse text-lg`}>➜</span>}
            </React.Fragment>
          ))}
        </div>
      </div>
    );

    if (diag.type === 'hierarchy') return (
      <div className="flex flex-col items-center py-3 gap-3">
        <span className={`text-[10px] text-${color} font-bold uppercase tracking-widest`}>🌳 {diag.title}</span>
        <div className={`bg-${color}/10 border-2 border-${color} rounded-2xl p-3 text-center max-w-[200px]`}>
          <span className="text-sm font-bold text-white block">{diag.elements[0].label}</span>
          <span className="text-[9px] text-cyber-text/70 block">{diag.elements[0].desc}</span>
        </div>
        {diag.elements.length > 1 && (
          <>
            <div className={`w-0.5 h-4 bg-${color}/40`} />
            <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
              {diag.elements.slice(1).map((el, i) => (
                <div key={i} className={`bg-cyber-bg/50 border border-${color}/30 rounded-xl p-2.5 text-center hover:border-${color} transition-all`}>
                  <span className={`text-xs font-bold text-${color} block`}>{el.label}</span>
                  <span className="text-[9px] text-cyber-text/60 block">{el.desc}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );

    if (diag.type === 'formula') return (
      <div className="flex flex-col items-center py-3 gap-3 font-mono">
        <span className={`text-[10px] text-${color} font-bold uppercase tracking-widest`}>🧮 {diag.title}</span>
        <div className={`bg-${color}/10 border border-${color}/40 rounded-2xl p-4 w-full max-w-sm`}>
          {diag.elements[0] && (
            <div className={`text-xl font-black text-white text-center border-b border-${color}/30 pb-2 mb-2`}>
              {diag.elements[0].label}
            </div>
          )}
          <div className="space-y-1.5 text-left">
            {diag.elements.map((el, i) => (
              <div key={i} className="text-[10px] flex gap-1.5">
                <span className={`text-${color}`}>•</span>
                <span><strong className="text-white">{el.label}: </strong><span className="text-cyber-text/80">{el.desc}</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );

    // Flowchart (default)
    return (
      <div className="flex flex-col items-center py-3 gap-2">
        <span className={`text-[10px] text-${color} font-bold uppercase tracking-widest`}>📋 {diag.title}</span>
        <div className="flex flex-col items-center gap-2 w-full max-w-sm">
          {diag.elements.map((el, i) => (
            <React.Fragment key={i}>
              <div className={`bg-cyber-bg/60 border border-cyber-border rounded-xl p-3 w-full flex items-center justify-between hover:border-${color} transition-all`}>
                <div>
                  <span className="text-xs font-bold text-white block">{el.label}</span>
                  <span className="text-[9px] text-cyber-text/50">{el.desc}</span>
                </div>
                <span className={`text-[9px] font-bold text-${color} bg-${color}/10 px-2 py-0.5 rounded border border-${color}/20`}>
                  {i + 1}
                </span>
              </div>
              {i < diag.elements.length - 1 && <div className={`w-0.5 h-3 bg-${color}/30 animate-pulse`} />}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const isLoading = boardState === 'loading';
  const isTeaching = boardState === 'teaching';

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-5">

      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-cyber-border/20 pb-3 font-mono text-xs">
        <button
          onClick={() => { stopSpeaking(); onNavigate('dashboard'); }}
          className="flex items-center gap-1.5 text-cyber-blue hover:text-cyan-400 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span>Exit Classroom</span>
        </button>
        <span className="font-outfit font-black text-cyber-purple tracking-widest uppercase flex items-center gap-1.5">
          <Presentation className="w-4.5 h-4.5" /> AI Smart Teaching Board
        </span>
        <div className="flex items-center gap-2">
          {/* Auto-speak toggle */}
          <button
            onClick={() => { setAutoSpeak(p => !p); if (autoSpeak) stopSpeaking(); }}
            className={`flex items-center gap-1 px-2.5 py-1 border rounded-lg transition-colors text-[9px] font-bold uppercase ${
              autoSpeak
                ? 'border-cyber-cyan text-cyber-cyan bg-cyber-cyan/10'
                : 'border-cyber-border text-cyber-text/50 hover:border-white'
            }`}
          >
            {autoSpeak ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
            {autoSpeak ? 'Auto-Speak ON' : 'Auto-Speak OFF'}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-3 py-1 border border-cyber-border hover:border-white rounded-lg transition-colors text-cyber-text/80"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* LEFT: CONFIG PANEL */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4">
          
          {/* Avatar */}
          <div className="flex flex-col items-center py-2">
            <AvatarTeacher isSpeaking={isSpeaking} language={selectedLanguage} />
          </div>

          <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
            <Presentation className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-outfit font-bold text-slate-800">Board Configuration</h2>
          </div>

          <form onSubmit={handleStartTeaching} className="flex flex-col gap-3">
            {/* Grade */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Class</label>
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
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Topic</label>
                <div className="relative">
                  <select value={selectedTopic} onChange={e => { setSelectedTopic(e.target.value); setTopicInput(e.target.value); }}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-700 focus:outline-none appearance-none cursor-pointer">
                    {topicsList.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Topic text input + mic */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Or type / speak topic</label>
              <div className="relative">
                <input type="text" value={topicInput} onChange={e => setTopicInput(e.target.value)}
                  placeholder="Speak or type any topic..."
                  className="w-full bg-slate-50 border border-slate-200 pl-3 pr-9 py-2 rounded-xl text-xs text-slate-700 focus:outline-none" />
                <button type="button" onClick={() => toggleMic(false)}
                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full transition-all ${
                    isListening ? 'text-rose-500 bg-rose-50 animate-pulse' : 'text-slate-400 hover:text-slate-700'}`}>
                  <Mic className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Modes */}
            <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Sliders className="w-3 h-3" /> Teaching Modes
              </span>
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer hover:text-slate-900">
                <input type="checkbox" checked={simplify} onChange={e => setSimplify(e.target.checked)}
                  className="rounded w-3.5 h-3.5 cursor-pointer accent-purple-600" />
                Simplify (Analogies)
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer hover:text-slate-900">
                <input type="checkbox" checked={visualMode} onChange={e => setVisualMode(e.target.checked)}
                  className="rounded w-3.5 h-3.5 cursor-pointer accent-blue-600" />
                Visual Diagrams
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer hover:text-slate-900">
                <input type="checkbox" checked={examPrep} onChange={e => setExamPrep(e.target.checked)}
                  className="rounded w-3.5 h-3.5 cursor-pointer accent-pink-600" />
                Exam Prep Mode
              </label>
              <div className="grid grid-cols-3 gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl mt-1">
                {(['beginner','intermediate','advanced'] as const).map(lvl => (
                  <button key={lvl} type="button" onClick={() => setSkillLevel(lvl)}
                    className={`py-1 text-[9px] font-bold rounded-lg uppercase transition-all ${
                      skillLevel === lvl ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-900'
                    }`}>
                    {lvl.slice(0,3).toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* START BUTTON */}
            <button type="submit" disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white font-inter font-bold text-xs flex items-center justify-center gap-2 shadow-lg mt-1 disabled:opacity-70 transition-all cursor-pointer">
              {isLoading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Preparing Lesson...</>
              ) : (
                <><Play className="w-4 h-4" /> Start Teaching</>
              )}
            </button>
          </form>
        </div>

        {/* RIGHT: SMART BOARD */}
        <div className="lg:col-span-8 flex flex-col gap-4">

          {/* Board panel */}
          <div className="w-full bg-[#03001e] border-4 border-cyber-border rounded-2xl shadow-glass flex flex-col min-h-[520px] relative overflow-hidden">

            {/* Board chrome */}
            <div className="flex items-center justify-between border-b border-cyber-border/20 px-5 py-3 bg-black/20">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isTeaching ? 'bg-cyber-cyan animate-pulse' : isLoading ? 'bg-cyber-yellow animate-pulse' : 'bg-cyber-border/40'}`} />
                <span className="text-[9px] font-mono font-bold text-cyber-cyan uppercase tracking-wider">
                  {isLoading ? 'AI is preparing your lesson...' : isTeaching ? `Live Lesson · ${LANGUAGES.find(l => l.code === selectedLanguage)?.name || 'English'}` : 'VIDYA AI Smart Board'}
                </span>
                {provider && (
                  <span className="text-[8px] font-mono text-cyber-text/30 ml-2">
                    [{provider === 'offline' ? '📡 OFFLINE' : provider === 'local_fallback' ? '💾 LOCAL' : `✨ ${provider.toUpperCase()}`}]
                  </span>
                )}
              </div>

              {/* Speaker control */}
              <div className="flex items-center gap-2">
                {isSpeaking ? (
                  <button onClick={stopSpeaking}
                    className="flex items-center gap-1 px-3 py-1 bg-cyber-pink text-white border border-cyber-pink rounded-lg text-[9px] font-bold uppercase cursor-pointer">
                    <VolumeX className="w-3 h-3" /> Stop
                  </button>
                ) : isTeaching ? (
                  <button onClick={() => speakText(lesson.title + '. ' + lesson.explanation)}
                    className="flex items-center gap-1 px-3 py-1 bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/30 hover:bg-cyber-cyan/25 rounded-lg text-[9px] font-bold uppercase cursor-pointer transition-all">
                    <Volume2 className="w-3 h-3" /> Speak Lesson
                  </button>
                ) : null}
              </div>
            </div>

            {/* Board content */}
            <div className="flex-1 flex flex-col p-5 overflow-auto">

              {/* IDLE state */}
              {boardState === 'idle' && (
                <div className="flex-1 flex flex-col gap-5 font-mono">
                  <h1 className="font-outfit font-extrabold text-2xl text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-cyber-cyan border-l-4 border-cyber-cyan pl-3">
                    {lesson.title}
                  </h1>
                  <p className="text-sm text-cyber-text/80 leading-relaxed font-outfit bg-black/30 p-4 rounded-xl border border-cyber-border/10">
                    {lesson.explanation}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-cyber-purple/5 p-4 rounded-xl border border-cyber-purple/20">
                      <span className="text-[10px] text-cyber-purple font-bold uppercase tracking-widest flex items-center gap-1.5 mb-2">
                        <Layers className="w-3.5 h-3.5" /> Quick Start
                      </span>
                      <ul className="text-[10px] text-cyber-text/80 space-y-1.5 list-disc list-inside">
                        {lesson.keyPoints.map((p, i) => <li key={i} className="leading-relaxed">{p}</li>)}
                      </ul>
                    </div>
                    <div className="bg-cyber-blue/5 p-4 rounded-xl border border-cyber-blue/20">
                      <span className="text-[10px] text-cyber-blue font-bold uppercase tracking-widest flex items-center gap-1.5 mb-2">
                        <BookOpen className="w-3.5 h-3.5" /> Try These
                      </span>
                      <ul className="text-[10px] text-cyber-text/80 space-y-2 list-none">
                        {lesson.examples.map((e, i) => (
                          <li key={i} className="leading-relaxed cursor-pointer hover:text-cyber-blue transition-colors"
                            onClick={() => { setTopicInput(e.replace(/^Try: /, '').split('→').pop()?.trim() || e); }}>
                            {e}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {renderDiagram(lesson.diagram)}
                </div>
              )}

              {/* LOADING state */}
              {boardState === 'loading' && (
                <div className="flex-1 flex flex-col items-center justify-center gap-5 py-16">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-cyber-cyan/20 border-t-cyber-cyan rounded-full animate-spin" />
                    <div className="absolute inset-2 w-10 h-10 border-4 border-cyber-purple/20 border-b-cyber-purple rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-cyber-cyan animate-pulse" />
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-sm font-mono text-cyber-cyan tracking-widest uppercase animate-pulse">
                      VIDYA AI is preparing your lesson...
                    </p>
                    <p className="text-[10px] font-mono text-cyber-text/40">
                      {subject} · Class {gradeLevel} · {LANGUAGES.find(l => l.code === selectedLanguage)?.name}
                    </p>
                    <p className="text-[9px] font-mono text-cyber-text/25">Topic: {topicInput}</p>
                  </div>
                  {/* Animated board lines */}
                  <div className="w-full max-w-md space-y-2 opacity-20">
                    {[80, 60, 90, 50, 70].map((w, i) => (
                      <div key={i} className="h-2 bg-cyber-cyan/40 rounded animate-pulse" style={{ width: `${w}%`, animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}

              {/* TEACHING state */}
              {boardState === 'teaching' && (
                <div className="flex-1 flex flex-col gap-4 font-mono">
                  <h1 className="font-outfit font-extrabold text-xl md:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-cyber-cyan leading-tight border-l-4 border-cyber-cyan pl-3">
                    {lesson.title}
                  </h1>
                  <p className="text-xs sm:text-sm text-cyber-text leading-relaxed font-outfit whitespace-pre-line bg-black/30 p-4 rounded-xl border border-cyber-border/10 min-h-[80px]">
                    {typedExplanation || lesson.explanation}
                    {typedExplanation && typedExplanation.length < lesson.explanation.length && (
                      <span className="inline-block w-0.5 h-4 bg-cyber-cyan animate-pulse ml-0.5 align-middle" />
                    )}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {lesson.keyPoints.length > 0 && (
                      <div className="bg-cyber-purple/5 p-4 rounded-xl border border-cyber-purple/20">
                        <span className="text-[10px] text-cyber-purple font-bold uppercase tracking-widest flex items-center gap-1 mb-2">
                          <Layers className="w-3 h-3" /> Key Points
                        </span>
                        <ul className="text-[10px] text-cyber-text/80 space-y-1.5 list-disc list-inside">
                          {lesson.keyPoints.map((p, i) => <li key={i} className="leading-relaxed">{p}</li>)}
                        </ul>
                      </div>
                    )}
                    {lesson.examples.length > 0 && (
                      <div className="bg-cyber-blue/5 p-4 rounded-xl border border-cyber-blue/20">
                        <span className="text-[10px] text-cyber-blue font-bold uppercase tracking-widest flex items-center gap-1 mb-2">
                          <Info className="w-3 h-3" /> Examples
                        </span>
                        <ul className="text-[10px] text-cyber-text/80 space-y-1.5 list-disc list-inside">
                          {lesson.examples.map((e, i) => <li key={i} className="leading-relaxed">{e}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                  {visualMode && renderDiagram(lesson.diagram)}
                  {lesson.summary && (
                    <div className="bg-cyber-cyan/5 p-3 rounded-lg border border-cyber-cyan/20 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyber-cyan shrink-0" />
                      <p className="text-[10px] text-cyber-cyan leading-tight">{lesson.summary}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ERROR state */}
              {boardState === 'error' && (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 py-16">
                  <div className="text-4xl">⚠️</div>
                  <p className="text-sm font-mono text-cyber-pink text-center">{errorMsg || 'Something went wrong.'}</p>
                  <button onClick={() => handleStartTeaching()}
                    className="flex items-center gap-2 px-4 py-2 bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/30 rounded-xl text-xs font-bold uppercase hover:bg-cyber-cyan/25 transition-all cursor-pointer">
                    <RotateCcw className="w-3.5 h-3.5" /> Retry
                  </button>
                </div>
              )}
            </div>

            {/* FOLLOW-UP BAR (only when teaching) */}
            {(isTeaching || boardState === 'teaching') && (
              <div className="border-t border-cyber-border/20 px-5 py-4 bg-black/20 space-y-3">
                <span className="text-[9px] text-cyber-text/40 uppercase tracking-widest font-mono">
                  💡 Ask a follow-up question to update the board
                </span>
                {/* Quick chips */}
                <div className="flex flex-wrap gap-1.5">
                  {['Explain more simply.','Give a real-life example.','What are exam tips?','Summarize this chapter.'].map(p => (
                    <button key={p} onClick={() => handleFollowUp(p)} disabled={isLoading}
                      className="px-2.5 py-1 rounded-full border border-cyber-border/30 hover:border-cyber-cyan/50 text-[9px] text-cyber-text/60 hover:text-cyber-cyan bg-black/40 transition-colors cursor-pointer disabled:opacity-40">
                      {p}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <input type="text" placeholder="Ask any question about this topic..."
                      value={followUp} onChange={e => setFollowUp(e.target.value)}
                      disabled={isLoading}
                      onKeyDown={e => { if (e.key === 'Enter') handleFollowUp(followUp); }}
                      className="w-full bg-black/50 border border-cyber-border/60 pl-3.5 pr-10 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-cyber-cyan placeholder-cyber-text/20 disabled:opacity-40" />
                    <button type="button" onClick={() => toggleMic(true)} disabled={isLoading}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full transition-all ${
                        isListeningFollowUp ? 'text-cyber-pink animate-pulse' : 'text-cyber-text/40 hover:text-white'
                      } disabled:opacity-40`}>
                      <Mic className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button onClick={() => handleFollowUp(followUp)} disabled={isLoading || !followUp.trim()}
                    className="px-4 py-2 bg-cyber-cyan text-black hover:opacity-90 disabled:opacity-30 rounded-xl font-bold text-xs uppercase flex items-center gap-1 cursor-pointer transition-all">
                    <Send className="w-3 h-3" /> Ask
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ArrowLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);


