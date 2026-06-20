import React, { useState, useEffect, useRef } from 'react';
import { useMainStore } from '../store/mainStore';
import { TRANSLATIONS, LANGUAGES } from '../store/translations';
import { CURRICULUM_FALLBACK } from '../store/curriculumFallback';
import { AvatarTeacher } from '../components/AvatarTeacher';
import { 
  Volume2, VolumeX, BookOpen, Search, ArrowLeft, 
  HelpCircle, BookOpenCheck, Bookmark, Mic, MicOff, Info, Presentation
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface LessonViewerProps {
  onNavigate: (page: string) => void;
  onStartQuiz: (topic: string, subject?: string, chapter?: string, numQuestions?: number, difficulty?: 'easy' | 'medium' | 'hard') => void;
}

export const LessonViewer: React.FC<LessonViewerProps> = ({ onNavigate, onStartQuiz }) => {
  const { 
    language, setLanguage, classLevel, setClassLevel, region, 
    lesson, setLesson, updateXP 
  } = useMainStore();
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;  // Dynamic curriculum states
  const [gradeLevel, setGradeLevel] = useState(classLevel);
  const [subjectsList, setSubjectsList] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  
  const [chaptersList, setChaptersList] = useState<string[]>([]);
  const [chapter, setChapter] = useState('');
  
  const [topicsList, setTopicsList] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState('');

  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [topicInput, setTopicInput] = useState('Photosynthesis');
  
  const [loading, setLoading] = useState(false);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [activeLessonLoaded, setActiveLessonLoaded] = useState(false);
  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  const [searchTab, setSearchTab] = useState<'rag' | 'curriculum'>('rag');
  const [chapterSearchQuery, setChapterSearchQuery] = useState('');
  const [chapterSearchResults, setChapterSearchResults] = useState<any[]>([]);
  const [isSearchingChapters, setIsSearchingChapters] = useState(false);

  const classesList = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

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
  // RAG states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingRAG, setIsSearchingRAG] = useState(false);

  // Voice capture for input
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Web Speech recognition for voice topic input
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = language === 'hi' ? 'hi-IN' : 'en-IN';

      rec.onstart = () => setIsListening(true);
      rec.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        setTopicInput(transcript.replace(/[.+]/g, ''));
      };
      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);
      recognitionRef.current = rec;
    }
  }, [language]);

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

  // Fetch or simulate lesson content
  const handleStartTeaching = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topicInput.trim()) return;
    
    setLoading(true);
    stopTTS();
    
    // Sync settings back to global store
    setLanguage(selectedLanguage);
    setClassLevel(gradeLevel);

    try {
      const response = await fetch('http://localhost:5000/api/learning/lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicInput,
          classLevel: gradeLevel,
          language: selectedLanguage,
          region,
          subject,
          chapter
        })
      });
      const data = await response.json();
      if (data.success) {
        setLesson({
          title: data.title,
          explanation: data.explanation,
          codeMixed: data.codeMixed,
          curriculumPoints: data.curriculumPoints,
          regionalExampleUsed: data.regionalExampleUsed
        });
        setActiveLessonLoaded(true);
      }
    } catch (e) {
      console.error("Fetch lesson error:", e);
    } finally {
      setLoading(false);
    }
  };

  // Run RAG Search
  const handleRAGSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearchingRAG(true);
    try {
      const response = await fetch('http://localhost:5000/api/learning/rag-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          classLevel: gradeLevel
        })
      });
      const data = await response.json();
      if (data.success) {
        setSearchResults(data.results);
      }
    } catch (err) {
      console.error("RAG search failed:", err);
    } finally {
      setIsSearchingRAG(false);
    }
  };

  // Run Curriculum Chapter Search
  const handleChapterSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterSearchQuery.trim()) return;
    setIsSearchingChapters(true);
    try {
      const response = await fetch(`http://localhost:5000/api/curriculum/search?query=${encodeURIComponent(chapterSearchQuery)}`);
      const data = await response.json();
      if (data.success) {
        setChapterSearchResults(data.results);
      }
    } catch (err) {
      console.error("Chapter search failed:", err);
    } finally {
      setIsSearchingChapters(false);
    }
  };

  // Web Speech synthesis read-aloud
  const speakTTS = () => {
    if (!lesson) return;
    window.speechSynthesis.cancel();
    if (isPlayingTTS) {
      setIsPlayingTTS(false);
      return;
    }

    const textToSpeak = `${lesson.title}. ${lesson.explanation}. Key takeaway: ${lesson.codeMixed}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    
    const langCodes: Record<string, string> = {
      en: 'en-IN', hi: 'hi-IN', gu: 'gu-IN', ta: 'ta-IN', 
      bn: 'bn-IN', mr: 'mr-IN', te: 'te-IN', ur: 'ur-PK'
    };
    utterance.lang = langCodes[selectedLanguage] || 'en-IN';
    utterance.rate = 0.95;

    utterance.onend = () => setIsPlayingTTS(false);
    utterance.onerror = () => setIsPlayingTTS(false);

    window.speechSynthesis.speak(utterance);
    setIsPlayingTTS(true);
  };

  const stopTTS = () => {
    window.speechSynthesis.cancel();
    setIsPlayingTTS(false);
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleLessonCompleted = () => {
    updateXP(100);
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#00f2fe', '#9b5de5', '#fee440']
    });
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col space-y-6">
      
      {/* HEADER NAV */}
      <div className="flex items-center justify-between border-b border-cyber-border/20 pb-4 font-mono text-xs">
        <button 
          onClick={() => { stopTTS(); onNavigate('dashboard'); }}
          className="flex items-center space-x-1.5 text-cyber-blue hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.backToDashboard}</span>
        </button>

        <h2 className="font-outfit font-black text-lg tracking-wider text-white uppercase flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-cyber-blue" />
          {t.lessons}
        </h2>

        <div className="w-20"></div>
      </div>

      {/* SEARCH AND DIRECTORY WIDGET */}
      <div className="glass-panel p-4 rounded-2xl border border-cyber-border/30 shadow-glass flex flex-col space-y-4">
        
        {/* Search Tab Toggles */}
        <div className="flex space-x-2 border-b border-cyber-border/10 pb-2 font-mono text-[10px] no-print">
          <button
            onClick={() => setSearchTab('rag')}
            className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
              searchTab === 'rag' 
                ? 'border-cyber-blue bg-cyber-blue/15 text-cyber-blue shadow-glow-blue/20' 
                : 'border-transparent text-cyber-text/60 hover:text-white'
            }`}
          >
            🔍 RAG Citation Search
          </button>
          <button
            onClick={() => setSearchTab('curriculum')}
            className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
              searchTab === 'curriculum' 
                ? 'border-cyber-purple bg-cyber-purple/15 text-cyber-purple shadow-glow-purple/20' 
                : 'border-transparent text-cyber-text/60 hover:text-white'
            }`}
          >
            📚 Curriculum Chapter Search
          </button>
        </div>

        {/* Search Tab 1: RAG Citation */}
        {searchTab === 'rag' ? (
          <div className="space-y-4">
            <form onSubmit={handleRAGSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-cyber-text/50" />
                <input
                  type="text"
                  placeholder="Search NCERT textbooks for reference citations (e.g. 'crops', 'atoms')..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/40 border border-cyber-border/60 pl-10 pr-4 py-2.5 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyber-blue placeholder-cyber-text/30"
                />
              </div>
              <button
                type="submit"
                disabled={isSearchingRAG}
                className="px-5 py-2.5 rounded-xl bg-cyber-blue hover:opacity-90 text-black font-mono font-bold text-xs uppercase transition-all shadow-glow-blue cursor-pointer"
              >
                {isSearchingRAG ? "Searching..." : "RAG Search"}
              </button>
            </form>

            {/* SEARCH RESULTS */}
            {searchResults.length > 0 && (
              <div className="pt-3 border-t border-cyber-border/20 flex flex-col space-y-2">
                <span className="text-[10px] font-mono text-cyber-cyan uppercase font-bold flex items-center gap-1">
                  <Bookmark className="w-3.5 h-3.5" /> Retrieved NCERT Segments:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {searchResults.map((res, index) => (
                    <div 
                      key={index}
                      onClick={() => {
                        setTopicInput(res.subject);
                        setSubject(res.subject);
                        handleStartTeaching();
                      }}
                      className="bg-cyber-bg/40 p-3 rounded-lg border border-cyber-border/30 hover:border-cyber-cyan cursor-pointer transition-all text-left flex flex-col justify-between"
                    >
                      <p className="text-[10px] text-cyber-text/80 leading-relaxed italic line-clamp-3">
                        "{res.content}"
                      </p>
                      <div className="mt-2 pt-2 border-t border-cyber-border/10 flex items-center justify-between text-[8px] font-mono">
                        <span className="text-cyber-purple font-semibold">{res.citation}</span>
                        <span className="text-cyber-cyan">Match: {Math.round(res.score * 100)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Search Tab 2: Curriculum Database
          <div className="space-y-4">
            <form onSubmit={handleChapterSearch} className="flex gap-2">
              <div className="relative flex-1">
                <BookOpen className="absolute left-3.5 top-3 w-4 h-4 text-cyber-text/50" />
                <input
                  type="text"
                  placeholder="Search 600+ curriculum chapter titles, keywords, or topics (e.g. 'Force', 'Algebra')..."
                  value={chapterSearchQuery}
                  onChange={(e) => setChapterSearchQuery(e.target.value)}
                  className="w-full bg-black/40 border border-cyber-border/60 pl-10 pr-4 py-2.5 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyber-purple placeholder-cyber-text/30"
                />
              </div>
              <button
                type="submit"
                disabled={isSearchingChapters}
                className="px-5 py-2.5 rounded-xl bg-cyber-purple hover:opacity-90 text-white font-mono font-bold text-xs uppercase transition-all shadow-glow-purple cursor-pointer"
              >
                {isSearchingChapters ? "Searching..." : "Search"}
              </button>
            </form>

            {/* CURRICULUM CHAPTER RESULTS */}
            {chapterSearchResults.length > 0 ? (
              <div className="pt-3 border-t border-cyber-border/20 flex flex-col space-y-2">
                <span className="text-[10px] font-mono text-cyber-purple uppercase font-bold flex items-center gap-1">
                  <Bookmark className="w-3.5 h-3.5" /> Matching Curriculum Chapters:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {chapterSearchResults.map((res, index) => (
                    <div 
                      key={index}
                      onClick={async () => {
                        // Dynamically update grade level, subject, and chapter
                        setGradeLevel(res.classLevel);
                        setSubject(res.subject);
                        setChapter(res.chapter);
                        setTopicInput(res.chapter);

                        // Trigger lesson loading with updated inputs
                        setLoading(true);
                        try {
                          const response = await fetch('http://localhost:5000/api/learning/lesson', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              topic: res.chapter,
                              classLevel: res.classLevel,
                              language: selectedLanguage,
                              region,
                              subject: res.subject,
                              chapter: res.chapter
                            })
                          });
                          const data = await response.json();
                          if (data.success) {
                            setLesson({
                              title: data.title,
                              explanation: data.explanation,
                              codeMixed: data.codeMixed,
                              curriculumPoints: data.curriculumPoints,
                              regionalExampleUsed: data.regionalExampleUsed
                            });
                            setActiveLessonLoaded(true);
                          }
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="bg-cyber-bg/40 p-3.5 rounded-xl border border-cyber-border/30 hover:border-cyber-purple cursor-pointer transition-all text-left flex flex-col justify-between"
                    >
                      <div>
                        <span className="text-[9px] bg-cyber-purple/20 border border-cyber-purple/40 px-2 py-0.5 rounded text-cyber-purple font-mono font-bold">
                          CLASS {res.classLevel} • {res.subject.toUpperCase()}
                        </span>
                        <h4 className="text-xs font-bold text-white mt-2 leading-tight">
                          {res.chapter}
                        </h4>
                      </div>
                      <div className="mt-3 pt-2 border-t border-cyber-border/10 flex items-center justify-between text-[8px] font-mono text-cyber-text/50">
                        <span>Topics: {res.topics?.length || 0}</span>
                        <span className="text-cyber-cyan uppercase font-semibold">NCERT</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              chapterSearchQuery && !isSearchingChapters && (
                <p className="text-[10px] text-cyber-text/40 font-mono italic">No matching curriculum chapters found.</p>
              )
            )}
          </div>
        )}
      </div>

      {/* CORE WORKSPACE: START TEACHING LAYOUT */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: START TEACHING FORM */}
        <div className="lg:col-span-5 bg-white p-8 rounded-3xl border border-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.04)] text-left flex flex-col space-y-6">
          <div className="flex items-center space-x-2.5 pb-2">
            <Presentation className="w-5 h-5 text-slate-800" />
            <h2 className="text-lg font-outfit font-bold text-slate-800 tracking-tight">Start Teaching</h2>
          </div>

          <form onSubmit={handleStartTeaching} className="space-y-5">
            
            {/* Grade Level Selector */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 font-inter">Class Level</label>
              <div className="relative">
                <select
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 cursor-pointer appearance-none font-inter"
                >
                  {classesList.map(cls => (
                    <option key={cls} value={Number(cls)}>
                      Class {cls}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            {/* Language Selector */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 font-inter">Language</label>
              <div className="relative">
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 cursor-pointer appearance-none font-inter"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            {/* Subject Selector */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 font-inter">Subject</label>
              <div className="relative">
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 cursor-pointer appearance-none font-inter"
                >
                  {subjectsList.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            {/* Chapter Selector */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 font-inter">Chapter</label>
              <div className="relative">
                <select
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 cursor-pointer appearance-none font-inter"
                >
                  {chaptersList.map(ch => (
                    <option key={ch} value={ch}>{ch}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            {/* Topic Selection Dropdown */}
            {topicsList.length > 0 && (
              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 font-inter">Select Chapter Topic</label>
                <div className="relative">
                  <select
                    value={selectedTopic}
                    onChange={(e) => {
                      setSelectedTopic(e.target.value);
                      setTopicInput(e.target.value);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 cursor-pointer appearance-none font-inter"
                  >
                    {topicsList.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>
            )}

            {/* Topic Input with Mic */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 font-inter">Or type / edit topic</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type or speak a custom topic..."
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 pl-4 pr-10 py-3 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 font-inter"
                />
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all ${
                    isListening ? 'text-rose-500 animate-pulse bg-rose-50' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Start Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#707a8a] hover:bg-[#5f6875] active:bg-[#4e5661] text-white font-inter font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
            >
              <Presentation className="w-4 h-4" />
              <span>{loading ? "Preparing Lesson..." : "Start Teaching"}</span>
            </button>

          </form>
        </div>

        {/* RIGHT COLUMN: LESSON TEXT SCREEN OR CHALKBOARD */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          
          {loading ? (
            <div className="glass-panel p-12 rounded-2xl border border-cyber-border/40 text-center flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-4 border-cyber-blue border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-mono text-cyber-blue">RAG Synthesizing Educational Concept...</span>
            </div>
          ) : activeLessonLoaded && lesson ? (
            /* ACTIVE LESSON VIEW */
            <div className="glass-panel p-6 rounded-2xl border border-cyber-border/40 shadow-glass flex flex-col space-y-5 text-left font-mono">
              <div className="flex justify-between items-center text-[10px] border-b border-cyber-border/20 pb-3">
                <span className="text-cyber-blue uppercase font-bold">Active Lecture Sheet</span>
                <button
                  onClick={speakTTS}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                    isPlayingTTS 
                      ? 'bg-cyber-pink text-white shadow-glow-purple'
                      : 'bg-cyber-cyan text-black shadow-glow-cyan'
                  }`}
                >
                  {isPlayingTTS ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  <span>{isPlayingTTS ? "Stop Audio" : "Voice Reader"}</span>
                </button>
              </div>

              <h1 className="font-outfit font-extrabold text-xl text-white">
                {lesson.title}
              </h1>

              <p className="text-xs sm:text-sm text-cyber-text/90 leading-relaxed font-outfit whitespace-pre-line">
                {lesson.explanation}
              </p>

              {/* Code mixed box */}
              <div className="bg-cyber-purple/10 p-3.5 rounded-xl border border-cyber-purple/30">
                <span className="text-[9px] text-cyber-purple font-bold uppercase tracking-widest flex items-center gap-1.5 mb-1">
                  <Info className="w-3 h-3" /> Code-mixed Language Summary
                </span>
                <p className="text-xs text-cyber-text font-mono leading-relaxed">
                  {lesson.codeMixed}
                </p>
              </div>

              {/* Objectives */}
              <div className="flex flex-col space-y-1.5">
                <span className="text-[10px] text-cyber-cyan uppercase font-bold">Core Learning Objectives:</span>
                <ul className="text-[10px] text-cyber-text/80 space-y-1 list-disc list-inside">
                  {lesson.curriculumPoints.map((pt, i) => (
                    <li key={i}>{pt}</li>
                  ))}
                </ul>
              </div>

              {/* Quiz Configuration Panel */}
              <div className="bg-cyber-bg/40 p-4 rounded-xl border border-cyber-border/25 space-y-4">
                <span className="text-[10px] text-cyber-cyan uppercase font-bold tracking-widest flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5" /> Configure Quiz Parameters
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Count Selector */}
                  <div className="space-y-2">
                    <label className="text-[9px] text-cyber-text/50 uppercase block font-bold">Number of Questions</label>
                    <div className="flex gap-2">
                      {[5, 10, 15, 20].map((nq) => (
                        <button
                          key={nq}
                          onClick={() => setNumQuestions(nq)}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                            numQuestions === nq
                              ? 'border-cyber-blue bg-cyber-blue/20 text-cyber-blue shadow-glow-blue'
                              : 'border-cyber-border/40 bg-black/30 text-cyber-text/60 hover:border-cyber-blue/50 hover:text-white'
                          }`}
                        >
                          {nq}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Difficulty Selector */}
                  <div className="space-y-2">
                    <label className="text-[9px] text-cyber-text/50 uppercase block font-bold">Difficulty Level</label>
                    <div className="flex gap-2">
                      {[
                        { val: 'easy', label: 'Easy', emoji: '🌱' },
                        { val: 'medium', label: 'Medium', emoji: '⚡' },
                        { val: 'hard', label: 'Hard', emoji: '🔥' }
                      ].map((d) => (
                        <button
                          key={d.val}
                          onClick={() => setDifficulty(d.val as any)}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                            difficulty === d.val
                              ? d.val === 'easy'
                                ? 'border-green-500 bg-green-500/20 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                                : d.val === 'medium'
                                ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.3)]'
                                : 'border-red-500 bg-red-500/20 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                              : 'border-cyber-border/40 bg-black/30 text-cyber-text/60 hover:text-white'
                          }`}
                        >
                          <span>{d.emoji}</span>
                          <span>{d.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom completed controls */}
              <div className="pt-4 border-t border-cyber-border/20 flex items-center justify-between gap-4">
                <button
                  onClick={handleLessonCompleted}
                  className="px-4 py-2 rounded-lg border border-cyber-blue/40 bg-cyber-blue/15 text-cyber-cyan text-[10px] font-bold uppercase cursor-pointer"
                >
                  Completed Lesson (+100 XP)
                </button>

                <button
                  onClick={() => onStartQuiz(topicInput, subject, chapter, numQuestions, difficulty)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyber-purple to-cyber-pink text-white font-bold uppercase text-[10px] tracking-wider flex items-center gap-1 shadow-glow-purple cursor-pointer animate-pulse"
                >
                  <HelpCircle className="w-3.5 h-3.5" /> Enter Quiz Arena
                </button>
              </div>

            </div>
          ) : (
            /* DEFAULT CHALKBOARD LOOK */
            <div className="w-full bg-[#0d2a1d] border-[10px] border-[#3d2c16] rounded-[2rem] p-8 flex flex-col items-center justify-center text-center min-h-[420px] shadow-lg relative overflow-hidden font-outfit">
              {/* Slate reflection or light gradient */}
              <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent pointer-events-none"></div>
              
              <h2 className="text-white text-4.5xl font-extrabold tracking-wide mb-3">
                AI Teacher
              </h2>
              <p className="text-white/95 text-lg font-medium max-w-sm leading-relaxed mb-8">
                Enter a topic and click 'Start Teaching' to begin!
              </p>

              <div className="text-left text-white/90 text-sm max-w-xs w-full pl-6 space-y-2 border-t border-white/10 pt-6">
                <span className="font-bold text-white uppercase tracking-wider block text-xs mb-3">Example topics:</span>
                <div className="space-y-2 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">•</span>
                    <span>Photosynthesis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">•</span>
                    <span>Solar System</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">•</span>
                    <span>Fractions</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

    </div>
  );
};
