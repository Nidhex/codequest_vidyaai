import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useMainStore } from '../store/mainStore';
import { useAnalyticsStore } from '../store/analyticsStore';
import { TRANSLATIONS, LANGUAGES } from '../store/translations';
import { CURRICULUM_FALLBACK } from '../store/curriculumFallback';
import { AvatarTeacher } from '../components/AvatarTeacher';
import {
  ArrowLeft, Mic, Volume2, RefreshCw,
  Presentation, ChevronDown, ChevronLeft, ChevronRight,
  Play, Square
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface VoiceClassroomProps {
  onNavigate: (page: string) => void;
}

interface Slide {
  slideNumber: number;
  heading: string;
  content: string;
  type: string;
}

type BoardState = 'idle' | 'loading' | 'teaching';

// ── Typewriter hook ──────────────────────────────────────────────
function useTypewriter(text: string, active: boolean, speed = 20) {
  const [displayed, setDisplayed] = useState('');
  const timerRef = useRef<any>(null);
  const textRef = useRef(text);

  useEffect(() => {
    textRef.current = text;
    setDisplayed('');
    if (!text || !active) { setDisplayed(text); return; }
    let i = 0;
    clearTimeout(timerRef.current);
    const tick = () => {
      if (i < textRef.current.length) {
        const chunk = Math.min(5, textRef.current.length - i);
        setDisplayed(textRef.current.slice(0, i + chunk));
        i += chunk;
        timerRef.current = setTimeout(tick, speed);
      }
    };
    tick();
    return () => clearTimeout(timerRef.current);
  }, [text, active]);

  return displayed;
}

// Slide type → color accent
const SLIDE_COLORS: Record<string, string> = {
  intro:       'from-green-600/20 to-green-800/10 border-green-500/30',
  definition:  'from-blue-600/20 to-blue-800/10 border-blue-500/30',
  core_theory: 'from-teal-600/20 to-teal-800/10 border-teal-500/30',
  theory:      'from-teal-600/20 to-teal-800/10 border-teal-500/30',
  types:       'from-violet-600/20 to-violet-800/10 border-violet-500/30',
  importance:  'from-amber-600/20 to-amber-800/10 border-amber-500/30',
  summary:     'from-emerald-600/20 to-emerald-800/10 border-emerald-500/30',
};

const SLIDE_LABEL_COLOR: Record<string, string> = {
  intro:       'text-green-300',
  definition:  'text-blue-300',
  core_theory: 'text-teal-300',
  theory:      'text-teal-300',
  types:       'text-violet-300',
  importance:  'text-amber-300',
  summary:     'text-emerald-300',
};

// Helper to split text into sentences matching English .!? and regional equivalents like । and newlines
const splitIntoSentences = (text: string): string[] => {
  if (!text) return [];
  const rawParts = text.split(/([.!?।\n]+)/);
  const result: string[] = [];
  for (let i = 0; i < rawParts.length; i += 2) {
    const chunk = rawParts[i]?.trim();
    const punct = rawParts[i + 1] || '';
    if (chunk) {
      result.push(chunk + punct.trim());
    }
  }
  return result.filter(s => s.trim().length > 0);
};

export const VoiceClassroom: React.FC<VoiceClassroomProps> = ({ onNavigate }) => {
  const { language, setLanguage, classLevel, setClassLevel, updateXP, user } = useMainStore();
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  useEffect(() => {
    document.title = "AI Voice Practice | VIDYA AI";
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', 'Experience interactive, voice-enabled Socratic learning in your local language with our holographic AI Teacher.');
  }, []);

  // Curriculum state
  const [gradeLevel, setGradeLevel] = useState(classLevel);
  const [subjectsList, setSubjectsList] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [chaptersList, setChaptersList] = useState<string[]>([]);
  const [chapter, setChapter] = useState('');
  const [topicsList, setTopicsList] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [topicInput, setTopicInput] = useState('Photosynthesis');

  // Board + slides state
  const [boardState, setBoardState] = useState<BoardState>('idle');
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left'|'right'>('right');

  // Voice & Narration States
  const [isPlayingAIAudio, setIsPlayingAIAudio] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isNarrating, setIsNarrating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [narrationSpeed, setNarrationSpeed] = useState(1.0);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [sentences, setSentences] = useState<string[]>([]);
  const [narrationError, setNarrationError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const slideContainerRef = useRef<HTMLDivElement | null>(null);
  const sentencesRef = useRef<string[]>([]);
  const classesList = ["1","2","3","4","5","6","7","8","9","10","11","12"];

  // 1. Fetch subjects when Class Level changes
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/curriculum/subjects?classLevel=${gradeLevel}`);
        const data = await res.json();
        if (data.success && data.subjects && data.subjects.length > 0) {
          setSubjectsList(data.subjects);
          setSubject(data.subjects[0]);
          return;
        }
      } catch (err) {
        console.error("Failed to load subjects from API, using fallback", err);
      }
      // Fallback
      const classInfo = CURRICULUM_FALLBACK[String(gradeLevel)];
      const fallbackSubjects = classInfo ? Object.keys(classInfo.subjects) : ["Mathematics", "Science"];
      setSubjectsList(fallbackSubjects);
      setSubject(fallbackSubjects[0] || '');
    };
    loadSubjects();
  }, [gradeLevel]);

  // 2. Fetch chapters when Subject or Class Level changes
  useEffect(() => {
    if (!subject) return;
    const loadChapters = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/curriculum/chapters?classLevel=${gradeLevel}&subject=${encodeURIComponent(subject)}`);
        const data = await res.json();
        if (data.success && data.chapters && data.chapters.length > 0) {
          setChaptersList(data.chapters);
          setChapter(data.chapters[0]);
          return;
        }
      } catch (err) {
        console.error("Failed to load chapters from API, using fallback", err);
      }
      // Fallback
      const classInfo = CURRICULUM_FALLBACK[String(gradeLevel)];
      const fallbackChapters = classInfo?.subjects[subject]
        ? Object.keys(classInfo.subjects[subject].chapters)
        : ["Chapter 1: Standard Concept", "Chapter 2: Advanced Concept"];
      setChaptersList(fallbackChapters);
      setChapter(fallbackChapters[0] || '');
    };
    loadChapters();
  }, [gradeLevel, subject]);

  // 3. Fetch topics when Chapter, Subject or Class Level changes
  useEffect(() => {
    if (!chapter || !subject) return;
    const loadTopics = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/curriculum/topics?classLevel=${gradeLevel}&subject=${encodeURIComponent(subject)}&chapter=${encodeURIComponent(chapter)}`);
        const data = await res.json();
        if (data.success && data.topics && data.topics.length > 0) {
          setTopicsList(data.topics);
          setSelectedTopic(data.topics[0]);
          setTopicInput(data.topics[0]);
          return;
        }
      } catch (err) {
        console.error("Failed to load topics from API, using fallback", err);
      }
      // Fallback
      const classInfo = CURRICULUM_FALLBACK[String(gradeLevel)];
      const fallbackTopics = classInfo?.subjects[subject]?.chapters[chapter] || ["Core Theory", "Key Applications"];
      setTopicsList(fallbackTopics);
      setSelectedTopic(fallbackTopics[0] || '');
      setTopicInput(fallbackTopics[0] || '');
    };
    loadTopics();
  }, [gradeLevel, subject, chapter]);

  // Web Speech recognition for voice topic input
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      const langCodes: Record<string, string> = {
        en: 'en-IN', hi: 'hi-IN', gu: 'gu-IN', ta: 'ta-IN', 
        bn: 'bn-IN', mr: 'mr-IN', te: 'te-IN', ur: 'ur-PK'
      };
      rec.lang = langCodes[selectedLanguage] || 'en-IN';

      rec.onstart = () => setIsListening(true);
      rec.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        setTopicInput(transcript.replace(/[.+]/g, ''));
      };
      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);
      recognitionRef.current = rec;
    }
  }, [selectedLanguage]);

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition not supported in this browser.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const slide = slides[currentSlide];
  const accentClass = slide ? (SLIDE_COLORS[slide.type] || SLIDE_COLORS.theory) : '';
  const labelClass  = slide ? (SLIDE_LABEL_COLOR[slide.type] || 'text-green-300') : '';

  // Typewriter — restarts every time slide changes
  const typedContent = useTypewriter(slide?.content || '', boardState === 'teaching', 18);

  const bodySentences = useMemo(() => splitIntoSentences(slide?.content || ''), [slide?.content]);

  // Voice Loading Loader
  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        setAvailableVoices(window.speechSynthesis.getVoices());
      }
    };
    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const getRegionalVoice = useCallback((langCode: string) => {
    const lc: Record<string, string> = {
      en:'en-IN', hi:'hi-IN', bn:'bn-IN', ta:'ta-IN',
      te:'te-IN', mr:'mr-IN', gu:'gu-IN', kn:'kn-IN',
      ml:'ml-IN', pa:'pa-IN', ur:'ur-PK', or:'or-IN'
    };
    const locale = lc[langCode] || 'en-IN';
    // Exact match
    let matchedVoice = availableVoices.find(v => v.lang.toLowerCase() === locale.toLowerCase() || v.lang.toLowerCase().replace('_', '-').startsWith(locale.toLowerCase().split('-')[0]));
    
    // Fallback language match
    if (!matchedVoice) {
      const shortLang = locale.split('-')[0];
      matchedVoice = availableVoices.find(v => v.lang.toLowerCase().startsWith(shortLang) || v.name.toLowerCase().includes(shortLang));
    }
    return matchedVoice || null;
  }, [availableVoices]);

  // Scroll active sentence into view
  const scrollToActiveSentence = useCallback((index: number) => {
    setTimeout(() => {
      const activeSpan = document.getElementById(`sentence-${index}`);
      if (activeSpan && slideContainerRef.current) {
        activeSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  }, []);

  // Start the voice reading scheduling
  const speakSentence = useCallback((index: number, list: string[] = sentencesRef.current) => {
    window.speechSynthesis.cancel();
    if (index >= list.length) {
      setIsNarrating(false);
      setIsPaused(false);
      setIsPlayingAIAudio(false);
      setCurrentSentenceIndex(0);
      utteranceRef.current = null;
      return;
    }

    const textToSpeak = list[index];
    if (!textToSpeak) return;

    const u = new SpeechSynthesisUtterance(textToSpeak);
    utteranceRef.current = u;

    // Pitch, speed and voice configuration
    u.rate = narrationSpeed;
    u.pitch = 1.05;
    const voice = getRegionalVoice(selectedLanguage);
    if (voice) {
      u.voice = voice;
    }
    
    const lc: Record<string, string> = {
      en:'en-IN', hi:'hi-IN', bn:'bn-IN', ta:'ta-IN',
      te:'te-IN', mr:'mr-IN', gu:'gu-IN', kn:'kn-IN',
      ml:'ml-IN', pa:'pa-IN', ur:'ur-PK', or:'or-IN'
    };
    u.lang = lc[selectedLanguage] || 'en-IN';

    u.onstart = () => {
      setIsPlayingAIAudio(true);
      setCurrentSentenceIndex(index);
      scrollToActiveSentence(index);
    };

    u.onend = () => {
      setIsPlayingAIAudio(false);
      // Wait a tiny bit between sentences for a natural flow
      setTimeout(() => {
        // Read the next sentence if still narrating and not paused
        if (sentencesRef.current === list) { // Verify list context matches
          // Read next sentence
          speakSentence(index + 1, list);
        }
      }, 300);
    };

    u.onerror = (e: any) => {
      console.error("SpeechSynthesis error:", e);
      setIsPlayingAIAudio(false);
      if (e.error !== 'interrupted') {
        setNarrationError("Voice narration temporarily unavailable. Retrying...");
        setTimeout(() => setNarrationError(null), 3000);
        // Advance to next sentence on failure so we don't block
        setTimeout(() => speakSentence(index + 1, list), 1000);
      }
    };

    window.speechSynthesis.speak(u);
  }, [selectedLanguage, narrationSpeed, getRegionalVoice, scrollToActiveSentence]);

  const startNarration = useCallback((heading: string, content: string) => {
    if (!heading && !content) return;
    setNarrationError(null);
    const bodyParts = splitIntoSentences(content);
    const list = [heading, ...bodyParts];
    setSentences(list);
    sentencesRef.current = list;
    setIsNarrating(true);
    setIsPaused(false);
    
    // Start with heading at index 0
    speakSentence(0, list);
  }, [speakSentence]);

  const handlePauseResume = useCallback(() => {
    if (!isNarrating) return;
    if (isPaused) {
      // Resume
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlayingAIAudio(true);
    } else {
      // Pause
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsPlayingAIAudio(false);
    }
  }, [isNarrating, isPaused]);

  const handleStopNarration = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsNarrating(false);
    setIsPaused(false);
    setIsPlayingAIAudio(false);
    setCurrentSentenceIndex(0);
    utteranceRef.current = null;
  }, []);

  const handleReplay = useCallback(() => {
    if (!isNarrating) return;
    window.speechSynthesis.cancel();
    setIsPaused(false);
    speakSentence(0);
  }, [isNarrating, speakSentence]);

  const handleSpeedChange = useCallback((speed: number) => {
    setNarrationSpeed(speed);
    if (isNarrating && !isPaused) {
      window.speechSynthesis.cancel();
      // Re-speak current sentence with the new speed immediately
      setTimeout(() => {
        const textToSpeak = sentencesRef.current[currentSentenceIndex];
        if (!textToSpeak) return;
        const u = new SpeechSynthesisUtterance(textToSpeak);
        utteranceRef.current = u;
        u.rate = speed;
        u.pitch = 1.05;
        const voice = getRegionalVoice(selectedLanguage);
        if (voice) u.voice = voice;
        const lc: Record<string, string> = {
          en:'en-IN', hi:'hi-IN', bn:'bn-IN', ta:'ta-IN',
          te:'te-IN', mr:'mr-IN', gu:'gu-IN', kn:'kn-IN',
          ml:'ml-IN', pa:'pa-IN', ur:'ur-PK', or:'or-IN'
        };
        u.lang = lc[selectedLanguage] || 'en-IN';
        u.onstart = () => {
          setIsPlayingAIAudio(true);
          scrollToActiveSentence(currentSentenceIndex);
        };
        u.onend = () => {
          setIsPlayingAIAudio(false);
          setTimeout(() => speakSentence(currentSentenceIndex + 1), 300);
        };
        u.onerror = (e) => {
          setIsPlayingAIAudio(false);
          if (e.error !== 'interrupted') {
            speakSentence(currentSentenceIndex + 1);
          }
        };
        window.speechSynthesis.speak(u);
      }, 100);
    }
  }, [isNarrating, isPaused, currentSentenceIndex, getRegionalVoice, selectedLanguage, speakSentence, scrollToActiveSentence]);

  // Keep compatibility for older auto-speak or slide navigation speak
  const speakText = useCallback((text: string) => {
    handleStopNarration();
    if (!text) return;
    const u = new SpeechSynthesisUtterance(text);
    utteranceRef.current = u;
    const voice = getRegionalVoice(selectedLanguage);
    if (voice) u.voice = voice;
    const lc: Record<string, string> = {
      en:'en-IN', hi:'hi-IN', bn:'bn-IN', ta:'ta-IN',
      te:'te-IN', mr:'mr-IN', gu:'gu-IN', kn:'kn-IN',
      ml:'ml-IN', pa:'pa-IN', ur:'ur-PK', or:'or-IN'
    };
    u.lang = lc[selectedLanguage] || 'en-IN';
    u.rate = 0.9; u.pitch = 1.05;
    u.onstart = () => setIsPlayingAIAudio(true);
    u.onend   = () => setIsPlayingAIAudio(false);
    u.onerror = () => setIsPlayingAIAudio(false);
    setIsPlayingAIAudio(true);
    window.speechSynthesis.speak(u);
  }, [selectedLanguage, getRegionalVoice, handleStopNarration]);

  const stopSpeech = useCallback(() => {
    handleStopNarration();
  }, [handleStopNarration]);

  const speakCurrentSlide = useCallback((s: Slide) => {
    startNarration(s.heading, s.content);
  }, [startNarration]);

  // ── Slide navigation with animation ───────────────────────────
  const goToSlide = (idx: number, dir: 'left'|'right') => {
    if (isAnimating || idx < 0 || idx >= slides.length) return;
    handleStopNarration();
    setIsAnimating(true);
    setSlideDirection(dir);
    setTimeout(() => {
      setCurrentSlide(idx);
      setIsAnimating(false);
      // Auto-speak new slide after 600ms (after typewriter starts)
      const target = slides[idx];
      if (target) setTimeout(() => speakCurrentSlide(target), 600);
    }, 300);
  };

  const prevSlide = () => goToSlide(currentSlide - 1, 'right');
  const nextSlide = () => goToSlide(currentSlide + 1, 'left');

  // ── Keyboard navigation ─────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (boardState !== 'teaching') return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextSlide();
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   prevSlide();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [boardState, currentSlide, slides, isAnimating]);

  // ── Fetch slides from API ───────────────────────────────────────
  const fetchSlides = async () => {
    setBoardState('loading');
    stopSpeech();
    setSlides([]);
    setCurrentSlide(0);

    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 14000);

      const res = await fetch('http://localhost:5000/api/learning/voice-class/slides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          topic: topicInput.trim(), classLevel: gradeLevel,
          language: selectedLanguage, subject, chapter
        })
      });
      clearTimeout(tid);
      const data = await res.json();

      if (data.success && Array.isArray(data.slides) && data.slides.length > 0) {
        setSlides(data.slides);
        setBoardState('teaching');
        setLanguage(selectedLanguage);
        setClassLevel(gradeLevel);
        updateXP(20);
        confetti({ particleCount: 60, spread: 65, colors: ['#22c55e','#86efac','#ffffff'], origin: { y: 0.6 } });
        // Auto-speak first slide
        setTimeout(() => speakCurrentSlide(data.slides[0]), 1000);
      } else {
        throw new Error('No slides returned');
      }
    } catch {
      // Offline fallback slides
      const fallback: Slide[] = [
        { slideNumber:1, type:'intro', heading:`Introduction to ${topicInput}`, content:`${topicInput} is an important concept in Class ${gradeLevel} ${subject}, part of the NCERT curriculum. It helps students understand how natural and scientific phenomena occur. Mastering this topic is essential for both board exams and higher education.` },
        { slideNumber:2, type:'definition', heading:`Definition of ${topicInput}`, content:`${topicInput} is defined as a fundamental scientific concept that describes specific phenomena studied in ${subject}. It is based on well-established theories, experiments and observations documented in the NCERT textbook for Class ${gradeLevel}.` },
        { slideNumber:3, type:'theory', heading:`Core Theory`, content:`The theoretical framework of ${topicInput} is built on key principles of ${subject}. These include the underlying laws, mechanisms and processes that define how the concept works. Scientists have studied and verified these principles through controlled experiments and systematic observations.` },
        { slideNumber:4, type:'types', heading:`Types and Classification`, content:`${topicInput} can be classified into several categories:\n\n1. Primary type — the most fundamental form.\n2. Secondary type — variations based on conditions.\n3. Applied type — practical uses in real-world contexts.\n\nThe NCERT textbook covers each category with diagrams.` },
        { slideNumber:5, type:'importance', heading:`Importance and Applications`, content:`${topicInput} is important for:\n\n1. Scientific understanding of nature and the environment.\n2. Technological innovations and industrial applications.\n3. Environmental protection and sustainability.\n4. Economic productivity in agriculture and industry.\n5. Providing the foundation for advanced studies in Class ${gradeLevel + 1} and beyond.` },
        { slideNumber:6, type:'summary', heading:`Summary and Review`, content:`Key points from today's lesson:\n\n✓ ${topicInput} is a core NCERT concept in Class ${gradeLevel} ${subject}.\n✓ It is governed by well-defined scientific principles.\n✓ It has multiple types and real-world applications.\n✓ Understanding it thoroughly is essential for board exams.\n✓ Revision tip: Re-read the chapter, draw diagrams and solve exercises.` }
      ];
      setSlides(fallback);
      setBoardState('teaching');
      setTimeout(() => speakCurrentSlide(fallback[0]), 800);
    }
  };

  const handleStartTeaching = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topicInput.trim()) return;
    fetchSlides();
  };

  const handleReset = () => {
    stopSpeech(); setSlides([]); setCurrentSlide(0); setBoardState('idle');
  };

  const handleLessonCompleted = () => {
    updateXP(100);
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#22c55e', '#a855f7', '#fee440']
    });

    const focusMinutes = 15;
    useAnalyticsStore.getState().addActivityLog({
      userId: user?.id || 'student_1',
      activityType: 'lesson',
      subject: subject || 'Science',
      chapter: chapter || '',
      topic: topicInput || 'General Lesson',
      timeSpent: focusMinutes
    }).catch(err => console.error("addActivityLog failed for Voice Lesson:", err));

    handleReset();
  };

  const isLoading  = boardState === 'loading';
  const isTeaching = boardState === 'teaching';
  const langObj    = LANGUAGES.find(l => l.code === selectedLanguage);

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-5">

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-cyber-border/20 pb-3 font-mono text-xs">
        <button onClick={() => { stopSpeech(); onNavigate('dashboard'); }}
          className="flex items-center gap-1.5 text-cyber-blue hover:text-cyan-400 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Classroom</span>
        </button>
        <span className="font-outfit font-black text-cyber-purple tracking-widest uppercase flex items-center gap-1.5 animate-pulse">
          <Volume2 className="w-4 h-4" /> {t.voiceClassroom}
        </span>
        <button onClick={handleReset}
          className="flex items-center gap-1 px-3 py-1 border border-cyber-border hover:border-white rounded-lg text-cyber-text/80 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>

      {/* ── MAIN GRID ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* LEFT — CONFIG PANEL */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-1">
            <div className={`relative w-full h-36 rounded-2xl overflow-hidden border-2 transition-all ${
              isPlayingAIAudio ? 'border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.4)]' : 'border-slate-100'
            }`} style={{ background: 'radial-gradient(circle at 35% 35%, #0d2a1d, #051008)' }}>
              <AvatarTeacher isSpeaking={isPlayingAIAudio} emotionState={isPlayingAIAudio ? 'happy' : 'encouraging'} speechIntensity={0.65} />
              {isPlayingAIAudio && (
                <div className="absolute inset-0 border-2 border-green-400/20 rounded-2xl animate-pulse pointer-events-none" />
              )}
            </div>
            
            {/* Visualizer Waveform */}
            {isPlayingAIAudio ? (
              <div className="flex items-end justify-center gap-0.5 h-6 mt-1.5 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20 w-fit">
                <style>{`
                  @keyframes soundwave {
                    0%, 100% { transform: scaleY(0.25); }
                    50% { transform: scaleY(1.2); }
                  }
                  .wave-bar {
                    animation: soundwave 0.8s ease-in-out infinite;
                    transform-origin: bottom;
                  }
                `}</style>
                {[...Array(10)].map((_, i) => {
                  const delays = ['0.1s', '0.4s', '0.2s', '0.5s', '0.3s', '0.6s', '0.15s', '0.45s', '0.25s', '0.55s'];
                  const heights = ['h-2.5', 'h-4', 'h-3.5', 'h-4.5', 'h-3', 'h-4', 'h-3.5', 'h-4.5', 'h-2.5', 'h-3.5'];
                  return (
                    <div 
                      key={i} 
                      className={`w-0.5 ${heights[i]} bg-green-400 rounded-full wave-bar`} 
                      style={{ animationDelay: delays[i] }} 
                    />
                  );
                })}
              </div>
            ) : (
              <p className={`text-[9px] font-mono font-bold uppercase tracking-widest ${
                isPlayingAIAudio ? 'text-green-500 animate-pulse' : 'text-slate-400'
              } mt-2`}>
                {isPlayingAIAudio ? '🎙 Speaking...' : 'AI TEACHER'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Presentation className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-outfit font-bold text-slate-800">Start Teaching</h2>
          </div>

          <form onSubmit={handleStartTeaching} className="flex flex-col gap-3">

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
                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full transition-all ${
                    isListening ? 'text-rose-500 bg-rose-50 animate-pulse' : 'text-slate-400 hover:text-slate-700'}`}>
                  <Mic className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* START BUTTON */}
            <button type="submit" disabled={isLoading}
              className="w-full py-3 rounded-xl bg-[#707a8a] hover:bg-[#5f6875] text-white font-inter font-semibold text-sm flex items-center justify-center gap-2 shadow cursor-pointer transition-all disabled:opacity-60 mt-1">
              {isLoading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating slides...</>
              ) : (
                <><Play className="w-4 h-4" /> Start Teaching</>
              )}
            </button>
          </form>

          {/* Slide dots (thumbnail list) */}
          {isTeaching && slides.length > 0 && (
            <div className="mt-1 border-t border-slate-100 pt-3">
              <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-2">Slides</p>
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                {slides.map((s, i) => (
                  <button key={i} onClick={() => goToSlide(i, i > currentSlide ? 'left' : 'right')}
                    className={`text-left px-3 py-2 rounded-xl text-[10px] transition-all cursor-pointer border ${
                      i === currentSlide
                        ? 'bg-[#0d2a1d] text-green-300 border-green-600/40 font-bold'
                        : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-slate-300'
                    }`}>
                    <span className="opacity-50 mr-1">{s.slideNumber}.</span> {s.heading}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — GREEN CHALKBOARD */}
        <div className="lg:col-span-8">
          <div className="w-full bg-[#0d2a1d] border-[12px] border-[#3d2c16] rounded-[2rem] min-h-[580px] flex flex-col relative overflow-hidden shadow-2xl">

            {/* Board chrome top */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  isTeaching ? 'bg-green-400 animate-pulse' :
                  isLoading  ? 'bg-yellow-400 animate-pulse' : 'bg-white/20'
                }`} />
                <span className="text-[9px] font-mono font-bold text-green-300 uppercase tracking-widest">
                  {isLoading  ? 'AI is writing slides...' :
                   isTeaching ? `${langObj?.name || 'English'} · Class ${gradeLevel} · ${subject}` :
                   'VIDYA AI — Green Board'}
                </span>
              </div>
              {/* Board controls */}
              {isTeaching && (
                <div className="flex items-center gap-2">
                  {isNarrating ? (
                    <button onClick={handleStopNarration}
                      className="px-3 py-1 text-[9px] font-bold bg-red-500/80 text-white rounded-lg uppercase cursor-pointer flex items-center gap-1 transition-all">
                      <Square className="w-2.5 h-2.5" /> Stop Voice
                    </button>
                  ) : (
                    <button onClick={() => slide && speakCurrentSlide(slide)}
                      className="px-3 py-1 text-[9px] font-bold bg-green-500/20 text-green-300 border border-green-500/30 rounded-lg uppercase cursor-pointer hover:bg-green-500/30 transition-all flex items-center gap-1">
                      🔊 Read Slide
                    </button>
                  )}
                  <span className="text-[9px] font-mono text-white/30">
                    ← → to navigate
                  </span>
                </div>
              )}            </div>

            {/* ── BOARD SURFACE ───────────────────────────────── */}
            <div className="flex-1 flex flex-col relative overflow-hidden">
              {/* Chalk line texture */}
              <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
                style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 34px,rgba(255,255,255,0.5) 35px)' }} />

              {/* IDLE */}
              {boardState === 'idle' && (
                <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center p-8 font-['Caveat',cursive]">
                  <h2 className="text-white text-4xl font-extrabold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                    AI Teacher
                  </h2>
                  <p className="text-white/80 text-lg max-w-sm leading-relaxed">
                    Select your class, language, subject &amp; topic — then click <strong className="text-green-300">"Start Teaching"</strong>
                  </p>
                  <div className="text-left text-white/70 text-base max-w-xs w-full space-y-2 border-t border-white/10 pt-4">
                    <span className="font-bold text-white text-sm uppercase tracking-wider block mb-1">Try these:</span>
                    {['Photosynthesis','Laws of Motion','Fractions','Agricultural Implements','Mughal Empire'].map(tp => (
                      <div key={tp} className="flex items-center gap-2 cursor-pointer hover:text-green-300 transition-colors text-sm"
                        onClick={() => setTopicInput(tp)}>
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
                  <div className="text-center space-y-1">
                    <p className="text-green-300 font-bold text-lg tracking-wide animate-pulse font-['Caveat',cursive]">Writing slides on board...</p>
                    <p className="text-white/40 text-xs font-mono">{subject} · Class {gradeLevel} · {topicInput}</p>
                  </div>
                  <div className="w-full max-w-sm space-y-3 mt-2 opacity-25">
                    {[70, 50, 80, 40, 65, 55].map((w,i) => (
                      <div key={i} className="h-1.5 bg-white/60 rounded animate-pulse" style={{ width:`${w}%`, animationDelay:`${i*0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}

              {/* TEACHING — animated slide content */}
              {boardState === 'teaching' && slide && (
                <div
                  key={currentSlide}
                  className={`flex-1 flex flex-col p-7 gap-4 font-['Caveat',cursive] transition-all duration-300 ${
                    isAnimating
                      ? `opacity-0 translate-x-${slideDirection === 'left' ? '8' : '-8'}`
                      : 'opacity-100 translate-x-0'
                  }`}
                  style={{
                    transition: 'opacity 0.3s ease, transform 0.3s ease',
                    opacity: isAnimating ? 0 : 1,
                    transform: isAnimating ? `translateX(${slideDirection === 'left' ? '30px' : '-30px'})` : 'translateX(0)'
                  }}
                >
                  {/* Slide header */}
                  <div className={`bg-gradient-to-r ${accentClass} border rounded-xl px-5 py-3`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[9px] font-mono font-bold uppercase tracking-widest ${labelClass}`}>
                        Slide {slide.slideNumber} of {slides.length} — {slide.type.replace(/_/g,' ')}
                      </span>
                    </div>
                    <h1 className="text-white text-2xl md:text-3xl font-extrabold leading-tight transition-all"
                      style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.6)' }}
                      id="sentence-0"
                    >
                      {isNarrating && currentSentenceIndex === 0 ? (
                        <span className="bg-cyan-500/25 border border-cyan-400/40 rounded px-1.5 py-0.5 text-white shadow-sm shadow-cyan-500/25 font-bold">
                          {slide.heading}
                        </span>
                      ) : (
                        slide.heading
                      )}
                    </h1>
                  </div>

                  {/* Content — highlighted spans or typewriter */}
                  <div ref={slideContainerRef} className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {isNarrating ? (
                      <div className="text-white/90 text-lg leading-relaxed whitespace-pre-line flex flex-col gap-2">
                        {bodySentences.map((sentence, idx) => {
                          const overallIndex = idx + 1; // index 0 is the heading
                          const isActive = currentSentenceIndex === overallIndex;
                          return (
                            <span
                              key={idx}
                              id={`sentence-${overallIndex}`}
                              className={`transition-all duration-300 rounded px-2 py-1 inline-block w-full text-left ${
                                isActive
                                  ? 'bg-cyan-500/10 border border-cyan-400/20 text-white font-semibold shadow-[0_0_15px_rgba(6,182,212,0.15)] opacity-100'
                                  : 'opacity-60 text-white/80'
                              }`}
                            >
                              {sentence}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-white/90 text-lg leading-relaxed whitespace-pre-line">
                        {typedContent || slide.content}
                        {typedContent && typedContent.length < slide.content.length && (
                          <span className="inline-block w-0.5 h-6 bg-green-400 animate-pulse ml-0.5 align-middle" />
                        )}
                      </p>
                    )}
                  </div>

                  {/* Floating / Integrated Voice Playback Control Panel */}
                  {isNarrating && (
                    <div className="bg-black/40 border border-white/10 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 mt-2 no-print font-mono text-xs text-white">
                      <div className="flex items-center gap-2">
                        {/* Play/Pause */}
                        <button
                          onClick={handlePauseResume}
                          className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30 transition-all font-bold flex items-center gap-1 cursor-pointer"
                        >
                          {isPaused ? <Play className="w-3.5 h-3.5" /> : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6" /></svg>}
                          <span>{isPaused ? 'Resume' : 'Pause'}</span>
                        </button>
                        
                        {/* Replay */}
                        <button
                          onClick={handleReplay}
                          className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 transition-all font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Replay</span>
                        </button>

                        {/* Stop */}
                        <button
                          onClick={handleStopNarration}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition-all font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Square className="w-3.5 h-3.5" />
                          <span>Stop</span>
                        </button>
                      </div>

                      {/* Sentence Tracker */}
                      <div className="text-[10px] text-white/50 bg-white/5 px-2 py-1 rounded-md border border-white/5 font-mono">
                        Sentence {currentSentenceIndex} / {sentences.length - 1 || 1}
                      </div>

                      {/* Speed selectors */}
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-white/40 uppercase font-bold mr-1">Speed:</span>
                        {[0.75, 1.0, 1.25, 1.5].map((speed) => (
                          <button
                            key={speed}
                            onClick={() => handleSpeedChange(speed)}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                              narrationSpeed === speed
                                ? 'bg-cyan-500/25 border-cyan-400/50 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                                : 'bg-transparent border-white/10 text-white/60 hover:text-white hover:border-white/20'
                            }`}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── SLIDE NAVIGATION BAR ───────────────────────── */}
            {isTeaching && slides.length > 0 && (
              <div className="border-t border-white/10 bg-black/20 px-6 py-4 flex items-center justify-between gap-4">

                {/* Prev button */}
                <button
                  onClick={prevSlide}
                  disabled={currentSlide === 0 || isAnimating}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer font-mono text-xs font-bold uppercase tracking-wider">
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                {/* Dot indicators */}
                <div className="flex items-center gap-1.5 flex-1 justify-center">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goToSlide(i, i > currentSlide ? 'left' : 'right')}
                      className={`rounded-full transition-all cursor-pointer ${
                        i === currentSlide
                          ? 'w-6 h-2.5 bg-green-400'
                          : 'w-2.5 h-2.5 bg-white/20 hover:bg-white/40'
                      }`}
                    />
                  ))}
                </div>

                {/* Next / Complete button */}
                {currentSlide === slides.length - 1 ? (
                  <button
                    onClick={handleLessonCompleted}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 border border-emerald-500 text-white hover:bg-emerald-500 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all cursor-pointer font-mono text-xs font-bold uppercase tracking-wider animate-pulse"
                  >
                    Complete Lesson
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={nextSlide}
                    disabled={isAnimating}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600/30 border border-green-500/40 text-green-300 hover:bg-green-600/50 disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer font-mono text-xs font-bold uppercase tracking-wider"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
