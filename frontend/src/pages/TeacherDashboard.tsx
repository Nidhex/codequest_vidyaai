import React, { useState, useEffect } from 'react';
import { useMainStore } from '../store/mainStore';
import { TRANSLATIONS, LANGUAGES, REGIONS } from '../store/translations';
import { CURRICULUM_FALLBACK } from '../store/curriculumFallback';
import { 
  ArrowLeft, BookOpen, Plus, FileText, CheckSquare, 
  BarChart2, Users, AlertTriangle, ShieldCheck, Cpu, 
  Printer, Share2, Save, Calendar, Send, Sparkles, 
  Check, Trash, Eye, BookOpenCheck, Layout, ListChecks, 
  MessageSquareCode, Clock, Info, CheckCircle2, Circle,
  Search, Flame, Award, Zap, TrendingUp, X, ChevronRight,
  Activity, UserPlus, Mail, GraduationCap
} from 'lucide-react';

interface TeacherDashboardProps {
  onNavigate: (page: string) => void;
}

interface ScheduledLesson {
  id: string;
  date: string;
  classLevel: number;
  subject: string;
  chapter: string;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Revision';
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onNavigate }) => {
  const { language, token, user } = useMainStore();
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  // 1. Selector States
  const [board, setBoard] = useState('NCERT');
  const [classLvl, setClassLvl] = useState<number>(8);
  const [subject, setSubject] = useState<string>('Science');
  const [chapter, setChapter] = useState<string>('Chapter 1: Crop Production and Management');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [region, setRegion] = useState<string>('North');

  // 1.5 Curriculum Search States
  const [chapterSearchQuery, setChapterSearchQuery] = useState('');
  const [chapterSearchResults, setChapterSearchResults] = useState<any[]>([]);
  const [isSearchingChapters, setIsSearchingChapters] = useState(false);
  const isProgrammaticRef = React.useRef(false);

  // 1.6 Classroom Telemetry States
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [assignedStudents, setAssignedStudents] = useState<any[]>([]);
  const [searchableStudents, setSearchableStudents] = useState<any[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [classroomAnalytics, setClassroomAnalytics] = useState<any>({
    totalStudents: 0,
    avgStreak: 0,
    avgQuizScore: 0,
    activeTodayCount: 0,
    subjectAverages: { Science: 0, Mathematics: 0, "Social Science": 0, English: 0, Hindi: 0 },
    insights: []
  });
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentStats, setSelectedStudentStats] = useState<any | null>(null);
  const [studentDetailsLoading, setStudentDetailsLoading] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignSearchQuery, setAssignSearchQuery] = useState('');
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const fetchTelemetry = async () => {
    if (!token) return;
    setTelemetryLoading(true);
    try {
      const [studentsRes, analyticsRes, searchRes] = await Promise.all([
        fetch('http://localhost:5000/api/teacher/students', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:5000/api/teacher/classroom-analytics', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:5000/api/teacher/all-students-search', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      const studentsData = await studentsRes.json();
      const analyticsData = await analyticsRes.json();
      const searchData = await searchRes.json();

      if (studentsData.success) setAssignedStudents(studentsData.students);
      if (analyticsData.success) setClassroomAnalytics(analyticsData.analytics);
      if (searchData.success) setSearchableStudents(searchData.students);
    } catch (err) {
      console.error("Failed to fetch classroom telemetry:", err);
    } finally {
      setTelemetryLoading(false);
    }
  };

  const fetchStudentDetails = async (studentId: string) => {
    if (!token) return;
    setStudentDetailsLoading(true);
    setSelectedStudentId(studentId);
    try {
      const res = await fetch(`http://localhost:5000/api/teacher/student/${studentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSelectedStudentStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch student details:", err);
    } finally {
      setStudentDetailsLoading(false);
    }
  };

  const handleAssignStudent = async (studentId: string) => {
    if (!token) return;
    setAssigningId(studentId);
    try {
      const res = await fetch('http://localhost:5000/api/teacher/assign', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ studentId })
      });
      const data = await res.json();
      if (data.success) {
        await fetchTelemetry();
      } else {
        alert(data.error || "Failed to assign student.");
      }
    } catch (err) {
      console.error("Failed to assign student:", err);
    } finally {
      setAssigningId(null);
    }
  };

  // 2. Dashboard UI States
  const [activeTab, setActiveTab] = useState<'planner' | 'scheduler' | 'telemetry'>('planner');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [shareSuccess, setShareSuccess] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(true);

  useEffect(() => {
    if (activeTab === 'telemetry') {
      fetchTelemetry();
    }
  }, [activeTab]);

  // 3. Syllabus Tracker State
  const [completedChapters, setCompletedChapters] = useState<Record<string, boolean>>({
    "8-Science-Chapter 1: Crop Production and Management": true
  });

  // 4. Default Initial Plan (Prepopulated for rich first-impression)
  const initialPlan = {
    id: "lp-default",
    title: "Crop Production & Management (Class 8 - NCERT)",
    overview: "Introduction to agricultural practices in India, covering soil preparation, sowing, irrigation, and crop protection.",
    objectives: [
      "Classify crops into Kharif and Rabi categories.",
      "Describe key agricultural implements used in soil preparation.",
      "Differentiate between manure and synthetic fertilizers."
    ],
    keyConcepts: [
      "Kharif Crops: Monsoon crops like paddy, maize, cotton.",
      "Rabi Crops: Winter crops like wheat, mustard, peas.",
      "Preparation of Soil: Tilling, ploughing, and leveling."
    ],
    realLifeExamples: [
      "Monsoon farming patterns in North/South India.",
      "Traditional organic composting in village fields."
    ],
    teachingFlow: [
      { step: 1, title: "Hook - Harvest Festival Discussion", desc: "Ask students about Makar Sankranti/Pongal/Bihu. Connect festivals to crop seasons." },
      { step: 2, title: "Concept Delivery - Kharif vs Rabi", desc: "Use pictures of crops to teach seasonal differences. Draw a comparison table." },
      { step: 3, title: "Hands-on - Seed Sorting Activity", desc: "Show students gram and wheat seeds. Ask them to sort them by touch and name them." },
      { step: 4, title: "Formative Assessment", desc: "Oral quiz matching crops to their correct season." }
    ],
    activities: [
      "Field visit or school garden compost pit setup.",
      "Group poster making comparing local crop types."
    ],
    homework: [
      "1. Write down names of three Rabi and Kharif crops grown in your district.",
      "2. Interview a parent or local gardener about how they prepare soil."
    ],
    revisionQuestions: [
      "Why can wheat not be grown during the monsoon season?",
      "What are the benefits of using organic manure over chemical fertilizers?"
    ],
    assessmentIdeas: [
      "Ask students to explain crop rotation in their own words in their mother tongue.",
      "Conduct a 5-question true/false clicker challenge on soil preparation."
    ],
    simplified: false
  };

  // 5. History & State Lists
  const [plans, setPlans] = useState<any[]>([initialPlan]);
  const [activePlan, setActivePlan] = useState<any>(initialPlan);

  const [schedule, setSchedule] = useState<ScheduledLesson[]>([
    {
      id: "sch-1",
      date: "2026-06-22",
      classLevel: 8,
      subject: "Science",
      chapter: "Chapter 1: Crop Production and Management",
      status: "Completed"
    },
    {
      id: "sch-2",
      date: "2026-06-25",
      classLevel: 8,
      subject: "Science",
      chapter: "Chapter 2: Microorganisms: Friend and Foe",
      status: "Scheduled"
    }
  ]);

  // 6. Assistant Panel Chat History Cached by Chapter
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<Record<string, { sender: 'user' | 'assistant', text: string }[]>>({
    "8-Science-Chapter 1: Crop Production and Management": [
      { sender: 'assistant', text: "Namaste! I am your AI Teaching Coach. I can help you design interactive quizzes, prepare oral questions, write bilingual notes, or simplify this chapter. Try clicking one of the quick prompt chips below!" }
    ]
  });

  const activeChatKey = `${classLvl}-${subject}-${chapter}`;
  const currentChat = chatMessages[activeChatKey] || [
    { sender: 'assistant', text: `Namaste! I can assist you with your lesson plan on "${chapter}" (Class ${classLvl}). Ask me to write a worksheet, design an activity, or create a quiz!` }
  ];

  // 7. Dynamic Dropdowns Flow
  useEffect(() => {
    if (isProgrammaticRef.current) {
      isProgrammaticRef.current = false;
      return;
    }
    const subjectsForClass = CURRICULUM_FALLBACK[String(classLvl)]?.subjects || {};
    const subjectList = Object.keys(subjectsForClass);
    if (subjectList.length > 0) {
      const defaultSub = subjectList.includes('Science') ? 'Science' : subjectList[0];
      setSubject(defaultSub);

      const chaptersForSub = subjectsForClass[defaultSub]?.chapters || {};
      const chapterList = Object.keys(chaptersForSub);
      if (chapterList.length > 0) {
        setChapter(chapterList[0]);
      }
    }
  }, [classLvl]);

  const handleSubjectChange = (sub: string) => {
    setSubject(sub);
    const subjectsForClass = CURRICULUM_FALLBACK[String(classLvl)]?.subjects || {};
    const chaptersForSub = subjectsForClass[sub]?.chapters || {};
    const chapterList = Object.keys(chaptersForSub);
    if (chapterList.length > 0) {
      setChapter(chapterList[0]);
    } else {
      setChapter('');
    }
  };

  // 8. Generate & Simplify Actions
  const handleGenerate = async (
    e?: React.FormEvent, 
    simplify: boolean = false,
    overrideClassLvl?: number,
    overrideSubject?: string,
    overrideChapter?: string
  ) => {
    if (e) e.preventDefault();
    
    const targetClassLvl = overrideClassLvl ?? classLvl;
    const targetSubject = overrideSubject ?? subject;
    const targetChapter = overrideChapter ?? chapter;

    if (!targetChapter) return;
    setLoading(true);

    const steps = [
      "Accessing NCERT Textbook index...",
      "Querying FastAPI multithreaded RAG server...",
      "Extracting local pedagogical examples...",
      "Injecting regional language translations...",
      "Structuring smart classroom instructions..."
    ];

    let currentStepIdx = 0;
    setLoadingStep(steps[0]);
    const stepInterval = setInterval(() => {
      currentStepIdx++;
      if (currentStepIdx < steps.length) {
        setLoadingStep(steps[currentStepIdx]);
      }
    }, 900);

    try {
      const response = await fetch('http://localhost:5000/api/teachers/lesson-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classLevel: targetClassLvl,
          board,
          subject: targetSubject,
          chapter: targetChapter,
          language: selectedLanguage,
          region,
          simplify
        })
      });
      const data = await response.json();
      if (data.success && data.lessonPlan) {
        setPlans([data.lessonPlan, ...plans]);
        setActivePlan(data.lessonPlan);
        setActiveTab('planner');
      }
    } catch (err) {
      console.error("Lesson generator error:", err);
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  };

  // 8.5 Curriculum Chapter Search Handler
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

  // 9. AI Assistant Chat
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;
    const cacheKey = activeChatKey;
    const updatedChat = [...currentChat, { sender: 'user' as const, text: textToSend }];
    
    setChatMessages(prev => ({ ...prev, [cacheKey]: updatedChat }));
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/teachers/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classLevel: classLvl,
          board,
          subject,
          chapter,
          language: selectedLanguage,
          region,
          message: textToSend
        })
      });
      const data = await response.json();
      if (data.success && data.response) {
        setChatMessages(prev => ({
          ...prev,
          [cacheKey]: [...updatedChat, { sender: 'assistant' as const, text: data.response }]
        }));
      }
    } catch (err) {
      console.error("Assistant API failed:", err);
      setChatMessages(prev => ({
        ...prev,
        [cacheKey]: [...updatedChat, { sender: 'assistant' as const, text: "I ran into an issue connecting to the orchestrator. Let's retry!" }]
      }));
    } finally {
      setChatLoading(false);
    }
  };

  // 10. Auto-Plan Syllabus
  const handleAutoPlan = () => {
    const subjectsForClass = CURRICULUM_FALLBACK[String(classLvl)]?.subjects || {};
    const chaptersForSub = subjectsForClass[subject]?.chapters || {};
    const chapterList = Object.keys(chaptersForSub);

    if (chapterList.length === 0) return;

    const newSchedules: ScheduledLesson[] = [];
    const startDay = 22; // Start from June 22, 2026 (Monday)

    chapterList.forEach((chName, idx) => {
      // Mondays and Wednesdays layout
      const dayOffset = Math.floor(idx / 2) * 7 + (idx % 2 === 0 ? 0 : 2);
      const dayNum = startDay + dayOffset;
      let month = 6;
      let actualDay = dayNum;
      if (dayNum > 30) {
        actualDay = dayNum - 30;
        month = 7;
      }

      const dateString = `2026-0${month}-${actualDay < 10 ? '0' : ''}${actualDay}`;
      newSchedules.push({
        id: `auto-${idx}-${Math.random()}`,
        date: dateString,
        classLevel: classLvl,
        subject: subject,
        chapter: chName,
        status: idx === 0 ? "Completed" : (idx === 1 ? "In Progress" : "Scheduled")
      });
    });

    setSchedule(newSchedules);
  };

  // 11. Clipboard Share
  const handleShare = () => {
    const textToCopy = `VIDYA AI SMART LESSON PLAN:\n\nTitle: ${activePlan.title}\n\nOverview:\n${activePlan.overview}\n\nObjectives:\n${activePlan.objectives?.join('\n')}`;
    navigator.clipboard.writeText(textToCopy);
    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 3000);
  };

  // 11.5 Calendar Grid Renderer
  const renderCalendar = () => {
    const days = Array.from({ length: 30 }, (_, i) => i + 1);
    return (
      <div className="grid grid-cols-7 gap-2 font-mono text-xs">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="text-center font-bold text-cyber-cyan py-1">{d}</div>
        ))}
        {days.map(day => {
          const dayDateString = `2026-06-${day < 10 ? '0' : ''}${day}`;
          const scheduled = schedule.filter(s => s.date === dayDateString);
          
          return (
            <div 
              key={day} 
              className="min-h-[70px] p-1.5 border border-cyber-border/10 rounded-xl bg-black/20 flex flex-col justify-between hover:border-cyber-purple/40 transition-colors cursor-pointer"
              onClick={() => {
                const isAlreadyScheduled = schedule.some(s => s.date === dayDateString && s.chapter === chapter);
                if (!isAlreadyScheduled && chapter) {
                  setSchedule([
                    ...schedule,
                    {
                      id: `sch-${Math.random()}`,
                      date: dayDateString,
                      classLevel: classLvl,
                      subject,
                      chapter,
                      status: 'Scheduled'
                    }
                  ]);
                }
              }}
            >
              <span className="font-bold text-cyber-text/50">{day}</span>
              {scheduled.map(s => (
                <div 
                  key={s.id} 
                  className={`text-[8px] p-1 rounded font-sans truncate ${
                    s.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                    s.status === 'In Progress' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                    s.status === 'Revision' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                    'bg-cyber-purple/20 text-cyber-purple-light border border-cyber-purple/30'
                  }`}
                  title={`${s.subject}: ${s.chapter}`}
                >
                  {s.chapter.split(':')[1]?.trim() || s.chapter}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  // 12. Completion calculation
  const chaptersForActiveList = Object.keys(CURRICULUM_FALLBACK[String(classLvl)]?.subjects[subject]?.chapters || {});
  const completedCount = chaptersForActiveList.filter(ch => completedChapters[`${classLvl}-${subject}-${ch}`]).length;
  const completionPercentage = chaptersForActiveList.length > 0 
    ? Math.round((completedCount / chaptersForActiveList.length) * 100) 
    : 0;

  return (
    <div className="w-full min-h-screen bg-[#03001e] text-cyber-text font-inter flex flex-row relative">
      
      {/* Dynamic Native Print Styling Override */}
      <style>{`
        @media print {
          body, html {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            background: white !important;
            color: black !important;
            border: none !important;
            box-shadow: none !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-card {
            background: white !important;
            color: black !important;
            border: 1px solid #ddd !important;
            box-shadow: none !important;
            margin-bottom: 1.5rem !important;
            page-break-inside: avoid !important;
            padding: 1.5rem !important;
            border-radius: 8px !important;
          }
          h1, h2, h3, h4, span, p, li {
            color: black !important;
          }
        }
      `}</style>

      {/* LEFT COLUMN: NAVIGATION & HISTORY */}
      <aside className="w-80 border-r border-cyber-border bg-[#0a0a23]/60 backdrop-blur-md p-5 flex flex-col justify-between shrink-0 no-print">
        <div className="flex flex-col space-y-6">
          
          {/* Dashboard Back Button */}
          <button 
            onClick={() => onNavigate('dashboard')}
            className="flex items-center space-x-2 text-cyber-blue hover:text-cyan-400 text-xs font-mono transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>STUDENT DASHBOARD</span>
          </button>

          {/* Module Header */}
          <div className="flex items-center space-x-2 pb-4 border-b border-cyber-border/30">
            <Cpu className="w-6 h-6 text-cyber-purple animate-pulse" />
            <div>
              <h2 className="font-outfit font-black text-sm tracking-wider text-white uppercase">VIDYA SMART OS</h2>
              <p className="text-[10px] text-cyber-purple font-mono">FOR INDIAN TEACHERS</p>
            </div>
          </div>

          {/* Tab Navigation Menu */}
          <nav className="flex flex-col space-y-2">
            <button
              onClick={() => setActiveTab('planner')}
              className={`flex items-center justify-between p-3 rounded-xl text-left text-xs font-bold transition-all ${
                activeTab === 'planner' 
                  ? 'bg-gradient-to-r from-cyber-purple/20 to-cyber-pink/20 border-l-4 border-cyber-pink text-white shadow-glow-purple' 
                  : 'hover:bg-white/5 text-cyber-text/80'
              }`}
            >
              <span className="flex items-center space-x-2.5">
                <Layout className="w-4 h-4 text-cyber-pink" />
                <span>AI Lesson Architect</span>
              </span>
              <Sparkles className="w-3.5 h-3.5 text-cyber-pink animate-pulse" />
            </button>

            <button
              onClick={() => setActiveTab('scheduler')}
              className={`flex items-center justify-between p-3 rounded-xl text-left text-xs font-bold transition-all ${
                activeTab === 'scheduler' 
                  ? 'bg-gradient-to-r from-cyber-blue/20 to-cyber-cyan/20 border-l-4 border-cyber-blue text-white shadow-glow-blue' 
                  : 'hover:bg-white/5 text-cyber-text/80'
              }`}
            >
              <span className="flex items-center space-x-2.5">
                <Calendar className="w-4 h-4 text-cyber-blue" />
                <span>Syllabus & Scheduler</span>
              </span>
              <span className="text-[9px] bg-cyber-blue/25 text-cyber-blue px-2 py-0.5 rounded-full font-mono">
                {completionPercentage}%
              </span>
            </button>

            <button
              onClick={() => setActiveTab('telemetry')}
              className={`flex items-center justify-between p-3 rounded-xl text-left text-xs font-bold transition-all ${
                activeTab === 'telemetry' 
                  ? 'bg-gradient-to-r from-cyber-cyan/20 to-cyber-blue/20 border-l-4 border-cyber-cyan text-white shadow-glow-cyan' 
                  : 'hover:bg-white/5 text-cyber-text/80'
              }`}
            >
              <span className="flex items-center space-x-2.5">
                <BarChart2 className="w-4 h-4 text-cyber-cyan" />
                <span>Classroom Telemetry</span>
              </span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-cyan opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyber-cyan"></span>
              </span>
            </button>
          </nav>

          {/* Planned Lessons History */}
          <div className="flex flex-col space-y-3 pt-4 border-t border-cyber-border/20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-cyber-text/50 uppercase font-bold tracking-wider">Plan Drafts & History</span>
              {plans.length > 1 && (
                <button 
                  onClick={() => { setPlans([initialPlan]); setActivePlan(initialPlan); }}
                  className="text-[9px] text-cyber-pink hover:underline font-mono flex items-center gap-0.5"
                >
                  <Trash className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
            
            <div className="flex flex-col space-y-2 max-h-56 overflow-y-auto pr-1">
              {plans.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setActivePlan(p);
                    // Dynamically align controls to the selected history item if possible
                    if (p.classLevel) setClassLvl(p.classLevel);
                    if (p.subject) setSubject(p.subject);
                    if (p.chapter) setChapter(p.chapter);
                    if (p.language) setSelectedLanguage(p.language);
                    setActiveTab('planner');
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all text-xs flex flex-col space-y-1 ${
                    activePlan?.id === p.id 
                      ? 'bg-cyber-purple/15 border-cyber-purple text-cyber-purple shadow-glow-purple/20' 
                      : 'bg-black/30 border-cyber-border/40 text-cyber-text/80 hover:border-cyber-purple/40 hover:bg-black/40'
                  }`}
                >
                  <span className="font-bold truncate text-white">{p.title}</span>
                  <div className="flex items-center justify-between text-[9px] text-cyber-text/50 font-mono">
                    <span>{p.simplified ? '✨ SIMPLIFIED' : 'STANDARD'}</span>
                    <span>Class {p.classLevel || 8}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* User Identity Footer */}
        <div className="p-3 bg-cyber-card rounded-xl border border-cyber-border/20 flex items-center space-x-3 mt-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyber-purple to-cyber-pink flex items-center justify-center font-outfit text-white font-black text-xs">
            {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'TR'}
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">{user?.name || "Teacher"}</h4>
            <p className="text-[9px] text-cyber-text/50 font-mono">{user?.email || "Teacher Node"}</p>
          </div>
        </div>
      </aside>

      {/* CORE WORKSPACE WINDOW */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        
        {/* TOP CONTROLS PLANNER PANEL (no-print) */}
        <div className="bg-[#0a0a23]/30 border-b border-cyber-border/30 p-5 space-y-4 no-print">
          
          <div className="flex justify-between items-center">
            <h1 className="font-outfit font-black text-lg text-white uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyber-purple" />
              AI Smart Planner Configurator
            </h1>
            <div className="text-[10px] text-cyber-text/50 font-mono flex items-center gap-2">
              <span>BOARD SYSTEM: NCERT MATRIX</span>
              <span className="px-2 py-0.5 rounded bg-cyber-purple/20 border border-cyber-purple/40 text-cyber-purple font-bold">ONLINE</span>
            </div>
          </div>

          <form onSubmit={(e) => handleGenerate(e, false)} className="grid grid-cols-1 md:grid-cols-6 gap-3 font-mono text-[11px]">
            {/* 1. Board Select */}
            <div className="flex flex-col space-y-1">
              <label className="text-cyber-text/50">BOARD STANDARD</label>
              <select
                value={board}
                onChange={(e) => setBoard(e.target.value)}
                className="bg-black/50 border border-cyber-border/70 p-2 rounded-xl text-white focus:outline-none focus:border-cyber-purple cursor-pointer"
              >
                <option value="NCERT">NCERT (National)</option>
                <option value="CBSE">CBSE Board</option>
                <option value="State Board">State Board</option>
              </select>
            </div>

            {/* 2. Class Select */}
            <div className="flex flex-col space-y-1">
              <label className="text-cyber-text/50">CLASS LEVEL</label>
              <select
                value={classLvl}
                onChange={(e) => setClassLvl(Number(e.target.value))}
                className="bg-black/50 border border-cyber-border/70 p-2 rounded-xl text-white focus:outline-none focus:border-cyber-purple cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(lvl => (
                  <option key={lvl} value={lvl}>Class {lvl}</option>
                ))}
              </select>
            </div>

            {/* 3. Subject Select */}
            <div className="flex flex-col space-y-1">
              <label className="text-cyber-text/50">SUBJECT</label>
              <select
                value={subject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="bg-black/50 border border-cyber-border/70 p-2 rounded-xl text-white focus:outline-none focus:border-cyber-purple cursor-pointer"
              >
                {Object.keys(CURRICULUM_FALLBACK[String(classLvl)]?.subjects || {}).map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            {/* 4. Chapter Select */}
            <div className="flex flex-col space-y-1 md:col-span-2">
              <label className="text-cyber-text/50">CHAPTER / TOPIC</label>
              <select
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                className="bg-black/50 border border-cyber-border/70 p-2 rounded-xl text-white focus:outline-none focus:border-cyber-purple cursor-pointer truncate"
              >
                {Object.keys(CURRICULUM_FALLBACK[String(classLvl)]?.subjects[subject]?.chapters || {}).map(chName => (
                  <option key={chName} value={chName}>{chName}</option>
                ))}
              </select>
            </div>

            {/* 5. Instruction Language Select */}
            <div className="flex flex-col space-y-1">
              <label className="text-cyber-text/50">INSTRUCTION LANGUAGE</label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-black/50 border border-cyber-border/70 p-2 rounded-xl text-white focus:outline-none focus:border-cyber-purple cursor-pointer"
              >
                {LANGUAGES.map(langOpt => (
                  <option key={langOpt.code} value={langOpt.code}>{langOpt.name}</option>
                ))}
              </select>
            </div>

            {/* 6. Region Select */}
            <div className="flex flex-col space-y-1">
              <label className="text-cyber-text/50">REGIONAL METAPHORS</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="bg-black/50 border border-cyber-border/70 p-2 rounded-xl text-white focus:outline-none focus:border-cyber-purple cursor-pointer"
              >
                {REGIONS.map(regOpt => (
                  <option key={regOpt.code} value={regOpt.code}>{regOpt.code} India</option>
                ))}
              </select>
            </div>

            {/* Action Buttons Row */}
            <div className="md:col-span-5 flex flex-row gap-2 mt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyber-purple to-cyber-indigo hover:opacity-90 disabled:opacity-50 text-white font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-glow-purple transition-all"
              >
                <Cpu className="w-4.5 h-4.5" />
                <span>Assemble Lesson Plan</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={(e) => handleGenerate(e, true)}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyber-pink to-cyber-yellow hover:opacity-90 disabled:opacity-50 text-white font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-glow-cyan transition-all"
              >
                <Sparkles className="w-4.5 h-4.5" />
                <span>✨ Simplify Chapter (Rural Metaphors)</span>
              </button>
            </div>
          </form>

          {/* CURRICULUM DIRECTORY SEARCH */}
          <div className="mt-5 pt-5 border-t border-cyber-border/20 space-y-3">
            <span className="text-[10px] font-mono text-cyber-purple uppercase font-bold flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" /> Quick Curriculum Directory Search
            </span>
            <form onSubmit={handleChapterSearch} className="flex gap-2">
              <div className="relative flex-1">
                <BookOpen className="absolute left-3.5 top-3.5 w-4 h-4 text-cyber-text/50" />
                <input
                  type="text"
                  placeholder="Search 600+ NCERT curriculum chapters, keywords, or topics (e.g. 'Force', 'Geometry')..."
                  value={chapterSearchQuery}
                  onChange={(e) => setChapterSearchQuery(e.target.value)}
                  className="w-full bg-black/40 border border-cyber-border/60 pl-10 pr-4 py-2.5 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyber-purple placeholder-cyber-text/30"
                />
              </div>
              <button
                type="submit"
                disabled={isSearchingChapters}
                className="px-5 py-2.5 rounded-xl bg-cyber-purple hover:opacity-90 text-white font-mono font-bold text-xs uppercase transition-all shadow-glow-purple cursor-pointer disabled:opacity-50"
              >
                {isSearchingChapters ? "Searching..." : "Search"}
              </button>
            </form>

            {/* CURRICULUM SEARCH RESULTS */}
            {chapterSearchResults.length > 0 && (
              <div className="pt-2 flex flex-col space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {chapterSearchResults.map((res, index) => {
                    const isSelected = classLvl === res.classLevel && subject.toLowerCase() === res.subject.toLowerCase() && chapter === res.chapter;
                    return (
                      <div 
                        key={index}
                        onClick={() => {
                          if (classLvl !== res.classLevel) {
                            isProgrammaticRef.current = true;
                          }
                          setClassLvl(res.classLevel);
                          setSubject(res.subject);
                          setChapter(res.chapter);
                        }}
                        className={`bg-cyber-bg/40 p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-cyber-purple bg-cyber-purple/10 shadow-[0_0_12px_rgba(186,104,200,0.15)]'
                            : 'border-cyber-border/30 hover:border-cyber-purple/50'
                        }`}
                      >
                        <div>
                          <span className="text-[8px] bg-cyber-purple/20 border border-cyber-purple/40 px-2 py-0.5 rounded text-cyber-purple font-mono font-bold">
                            CLASS {res.classLevel} • {res.subject.toUpperCase()}
                          </span>
                          <h4 className="text-xs font-bold text-white mt-1.5 leading-tight">
                            {res.chapter}
                          </h4>
                        </div>
                        
                        {/* Action buttons inside card */}
                        <div className="mt-3 pt-2 border-t border-cyber-border/10 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (classLvl !== res.classLevel) {
                                isProgrammaticRef.current = true;
                              }
                              setClassLvl(res.classLevel);
                              setSubject(res.subject);
                              setChapter(res.chapter);
                              handleGenerate(undefined, false, res.classLevel, res.subject, res.chapter);
                            }}
                            className="flex-1 py-1 rounded bg-cyber-purple/30 hover:bg-cyber-purple/50 border border-cyber-purple/50 text-white font-mono text-[9px] font-bold uppercase transition-all cursor-pointer text-center"
                          >
                            Assemble
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (classLvl !== res.classLevel) {
                                isProgrammaticRef.current = true;
                              }
                              setClassLvl(res.classLevel);
                              setSubject(res.subject);
                              setChapter(res.chapter);
                              handleGenerate(undefined, true, res.classLevel, res.subject, res.chapter);
                            }}
                            className="flex-1 py-1 rounded bg-cyber-pink/30 hover:bg-cyber-pink/50 border border-cyber-pink/50 text-white font-mono text-[9px] font-bold uppercase transition-all cursor-pointer text-center"
                          >
                            Simplify
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {chapterSearchQuery && !isSearchingChapters && chapterSearchResults.length === 0 && (
              <p className="text-[10px] text-cyber-text/40 font-mono italic">No matching curriculum chapters found.</p>
            )}
          </div>
        </div>

        {/* ACTIVE MAIN CONTENT AREA */}
        <div className="p-6 flex-1">
          
          {/* A. PLANNER TAB VIEW */}
          {activeTab === 'planner' && (
            <div className="space-y-6">
              
              {/* Loader overlay */}
              {loading ? (
                <div className="glass-panel p-16 rounded-2xl border border-cyber-border/30 text-center flex flex-col justify-center items-center space-y-6 max-w-2xl mx-auto mt-12">
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-full border-4 border-cyber-purple/20 border-t-4 border-t-cyber-purple animate-spin"></div>
                    <Cpu className="w-8 h-8 text-cyber-purple absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                  </div>
                  
                  <div className="space-y-2 w-full">
                    <h3 className="font-outfit font-black tracking-widest text-white uppercase text-sm animate-pulse">Generating Structured Matrix</h3>
                    <p className="text-xs text-cyber-cyan font-mono">{loadingStep}</p>
                  </div>

                  {/* Pulsing neon scanning bar */}
                  <div className="w-full h-1 bg-cyber-bg border border-cyber-border/30 rounded-full overflow-hidden relative">
                    <div className="absolute top-0 bottom-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-cyber-cyan to-transparent animate-hologram"></div>
                  </div>
                </div>
              ) : activePlan ? (
                
                /* Real Plan Preview Panel */
                <div className="space-y-6 print-container">
                  
                  {/* Top Preview Action Controls Bar (no-print) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-cyber-card border border-cyber-border/20 p-4 rounded-2xl no-print">
                    <div className="flex items-center space-x-2">
                      <BookOpenCheck className="w-5 h-5 text-cyber-purple" />
                      <div>
                        <span className="text-[10px] text-cyber-text/50 font-mono">ACTIVE SELECTION DETAILS</span>
                        <h4 className="text-xs font-bold text-white font-mono uppercase">{activePlan.title}</h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[10px]">
                      <button
                        onClick={() => window.print()}
                        className="py-2 px-3 rounded-lg border border-cyber-border hover:border-cyber-purple bg-black/40 hover:bg-cyber-purple/15 text-white flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" /> PRINT / SAVE PDF
                      </button>

                      <button
                        onClick={handleShare}
                        className="py-2 px-3 rounded-lg border border-cyber-border hover:border-cyber-cyan bg-black/40 hover:bg-cyber-cyan/15 text-white flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" /> {shareSuccess ? "COPIED PLAN!" : "SHARE PLAN"}
                      </button>

                      <button
                        onClick={() => {
                          if (!plans.some(p => p.id === activePlan.id)) {
                            setPlans([activePlan, ...plans]);
                          }
                          alert("Draft saved to planned lessons history!");
                        }}
                        className="py-2 px-3 rounded-lg border border-cyber-border hover:border-cyber-pink bg-black/40 hover:bg-cyber-pink/15 text-white flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" /> SAVE DRAFT
                      </button>
                    </div>
                  </div>

                  {/* 1. Overview & Objectives Card */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print-container">
                    
                    <div className="lg:col-span-7 glass-panel p-6 rounded-2xl border border-cyber-border/40 shadow-glass text-left space-y-4 print-card">
                      <span className="text-[10px] font-mono text-cyber-purple font-bold tracking-wider uppercase flex items-center gap-1">
                        <Info className="w-3.5 h-3.5" /> 1. Chapter Overview
                      </span>
                      <h2 className="font-outfit font-extrabold text-lg text-white">
                        {activePlan.title}
                      </h2>
                      <p className="text-xs text-cyber-text/90 leading-relaxed font-sans">
                        {activePlan.overview}
                      </p>
                    </div>

                    <div className="lg:col-span-5 glass-panel p-6 rounded-2xl border border-cyber-border/40 shadow-glass text-left space-y-4 print-card">
                      <span className="text-[10px] font-mono text-cyber-pink font-bold tracking-wider uppercase flex items-center gap-1">
                        <CheckSquare className="w-3.5 h-3.5" /> 2. Learning Objectives
                      </span>
                      <ul className="text-xs text-cyber-text/80 space-y-2">
                        {(activePlan.objectives || []).map((obj: string, idx: number) => (
                          <li key={idx} className="flex items-start space-x-2">
                            <span className="text-cyber-pink font-bold text-sm shrink-0">✓</span>
                            <span className="leading-relaxed font-sans">{obj}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                  </div>

                  {/* 2. Key Concepts & Regional Metaphor Card */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print-container">
                    
                    <div className="lg:col-span-6 glass-panel p-6 rounded-2xl border border-cyber-border/40 shadow-glass text-left space-y-4 print-card">
                      <span className="text-[10px] font-mono text-cyber-cyan font-bold tracking-wider uppercase flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" /> 3. Core NCERT Concepts
                      </span>
                      <ul className="text-xs text-cyber-text/80 space-y-3 font-mono">
                        {(activePlan.keyConcepts || []).map((concept: string, idx: number) => (
                          <li key={idx} className="bg-black/30 p-2.5 rounded-xl border border-cyber-border/10 flex items-start space-x-2">
                            <span className="bg-cyber-cyan/15 text-cyber-cyan font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                              {idx+1}
                            </span>
                            <span className="leading-relaxed">{concept}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="lg:col-span-6 glass-panel p-6 rounded-2xl border border-cyber-border/40 shadow-glass text-left space-y-4 print-card">
                      <span className="text-[10px] font-mono text-cyber-yellow font-bold tracking-wider uppercase flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> 4. Real-life & Regional Metaphors
                      </span>
                      <ul className="text-xs text-cyber-text/80 space-y-3 font-sans">
                        {(activePlan.realLifeExamples || []).map((ex: string, idx: number) => (
                          <li key={idx} className="bg-cyber-yellow/5 p-3 rounded-xl border border-cyber-yellow/20 flex items-start space-x-3">
                            <span className="text-cyber-yellow font-bold text-lg shrink-0 mt-0.5">💡</span>
                            <span className="leading-relaxed">{ex}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                  </div>

                  {/* 3. Teaching Flow Stepper Timeline */}
                  <div className="glass-panel p-6 rounded-2xl border border-cyber-border/40 shadow-glass text-left space-y-6 print-card">
                    <span className="text-[10px] font-mono text-cyber-purple font-bold tracking-wider uppercase flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> 5. Step-by-Step Classroom Teaching Flow
                    </span>

                    <div className="flex flex-col space-y-5 pl-4 border-l-2 border-cyber-purple/35 relative">
                      {(activePlan.teachingFlow || []).map((step: any, idx: number) => (
                        <div key={idx} className="relative flex flex-col space-y-1.5 font-sans">
                          {/* Stepper Dot */}
                          <div className="absolute -left-[24px] top-1 w-3.5 h-3.5 rounded-full bg-cyber-purple border-2 border-[#03001e] shadow-glow-purple flex items-center justify-center text-[8px] font-bold text-white">
                            {idx + 1}
                          </div>
                          
                          <h4 className="text-xs text-white font-bold">{step.title}</h4>
                          <p className="text-[11px] text-cyber-text/80 leading-relaxed max-w-4xl">{step.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 4. Classroom Activities & Homework Card */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print-container">
                    
                    <div className="lg:col-span-6 glass-panel p-6 rounded-2xl border border-cyber-border/40 shadow-glass text-left space-y-4 print-card">
                      <span className="text-[10px] font-mono text-cyber-cyan font-bold tracking-wider uppercase flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> 6. Interactive Activities
                      </span>
                      <ul className="text-xs text-cyber-text/80 space-y-2">
                        {(activePlan.activities || []).map((act: string, idx: number) => (
                          <li key={idx} className="bg-black/30 p-3 rounded-xl border border-cyber-border/10 flex items-start space-x-2">
                            <span className="text-cyber-cyan font-black shrink-0">🤝</span>
                            <span className="leading-relaxed font-sans">{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="lg:col-span-6 glass-panel p-6 rounded-2xl border border-cyber-border/40 shadow-glass text-left space-y-4 print-card">
                      <span className="text-[10px] font-mono text-cyber-pink font-bold tracking-wider uppercase flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 7. Homework & Worksheets
                      </span>
                      <ul className="text-xs text-cyber-text/80 space-y-2">
                        {(activePlan.homework || []).map((hw: string, idx: number) => (
                          <li key={idx} className="bg-black/30 p-3 rounded-xl border border-cyber-border/10 flex items-start space-x-2">
                            <span className="text-cyber-pink font-black shrink-0">📝</span>
                            <span className="leading-relaxed font-sans">{hw}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                  </div>

                  {/* 5. Revision Questions & Assessment Ideas Card */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print-container">
                    
                    <div className="lg:col-span-6 glass-panel p-6 rounded-2xl border border-cyber-border/40 shadow-glass text-left space-y-4 print-card">
                      <span className="text-[10px] font-mono text-cyber-yellow font-bold tracking-wider uppercase flex items-center gap-1">
                        <MessageSquareCode className="w-3.5 h-3.5" /> 8. Revision & Oral Questions
                      </span>
                      <ul className="text-xs text-cyber-text/80 space-y-2 font-mono">
                        {(activePlan.revisionQuestions || []).map((q: string, idx: number) => (
                          <li key={idx} className="bg-cyber-yellow/5 p-3 rounded-xl border border-cyber-yellow/15 flex items-start space-x-2">
                            <span className="text-cyber-yellow font-bold shrink-0">❓</span>
                            <span className="leading-relaxed">{q}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="lg:col-span-6 glass-panel p-6 rounded-2xl border border-cyber-border/40 shadow-glass text-left space-y-4 print-card">
                      <span className="text-[10px] font-mono text-cyber-purple font-bold tracking-wider uppercase flex items-center gap-1">
                        <ListChecks className="w-3.5 h-3.5" /> 9. Formative Assessment Ideas
                      </span>
                      <ul className="text-xs text-cyber-text/80 space-y-2">
                        {(activePlan.assessmentIdeas || []).map((idea: string, idx: number) => (
                          <li key={idx} className="bg-cyber-purple/5 p-3 rounded-xl border border-cyber-purple/15 flex items-start space-x-2">
                            <span className="text-cyber-purple font-bold shrink-0">📈</span>
                            <span className="leading-relaxed font-sans">{idea}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                  </div>

                </div>
              ) : (
                <div className="glass-panel p-16 rounded-2xl border border-cyber-border/30 text-center text-cyber-text/60 font-mono">
                  Select chapter controls at the top to configure a new NCERT lesson planner sequence.
                </div>
              )}
            </div>
          )}

          {/* B. SCHEDULER TAB VIEW */}
          {activeTab === 'scheduler' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
              
              {/* Tracker Checklist (Left 4 cols) */}
              <div className="lg:col-span-4 flex flex-col space-y-4">
                
                <div className="glass-panel p-5 rounded-2xl border border-cyber-border/40 shadow-glass flex flex-col space-y-4">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyber-blue flex items-center gap-1.5">
                    <ListChecks className="w-4.5 h-4.5" /> Syllabus Checklist
                  </h3>

                  {/* Completion status bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between font-mono text-[10px]">
                      <span>COMPLETION RATIO</span>
                      <span className="text-cyber-blue font-bold">{completionPercentage}%</span>
                    </div>
                    <div className="w-full h-2 bg-black/40 rounded-full border border-cyber-border/20 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyber-blue to-cyber-cyan transition-all duration-500 shadow-glow-blue" 
                        style={{ width: `${completionPercentage}%` }}
                      ></div>
                    </div>
                  </div>

                  <p className="text-[10px] text-cyber-text/60 leading-relaxed font-sans">
                    Syllabus progress for Class {classLvl} {subject}. Check completed chapters to sync tracking telemetry.
                  </p>

                  <div className="flex flex-col space-y-2 max-h-96 overflow-y-auto pr-1">
                    {chaptersForActiveList.map(chName => {
                      const itemKey = `${classLvl}-${subject}-${chName}`;
                      const isCompleted = !!completedChapters[itemKey];

                      return (
                        <div 
                          key={chName}
                          onClick={() => {
                            setCompletedChapters({
                              ...completedChapters,
                              [itemKey]: !isCompleted
                            });
                          }}
                          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            isCompleted 
                              ? 'bg-cyber-blue/5 border-cyber-blue/40 text-cyber-blue font-bold' 
                              : 'bg-black/20 border-cyber-border/10 text-cyber-text/70 hover:border-cyber-border/40'
                          }`}
                        >
                          <span className="truncate max-w-[190px] font-sans">{chName.split(':')[1]?.trim() || chName}</span>
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-cyber-blue shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-cyber-text/30 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Auto Schedule Buttons */}
                  <button
                    onClick={handleAutoPlan}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyber-blue to-cyber-cyan text-white hover:opacity-90 font-bold uppercase font-mono text-[10px] tracking-wider flex items-center justify-center gap-1 shadow-glow-blue cursor-pointer transition-all"
                  >
                    <Cpu className="w-3.5 h-3.5 animate-spin" /> Auto-Plan Syllabus
                  </button>
                </div>

              </div>

              {/* Interactive Calendar view (Right 8 cols) */}
              <div className="lg:col-span-8 flex flex-col space-y-4">
                
                <div className="glass-panel p-5 rounded-2xl border border-cyber-border/40 shadow-glass flex flex-col space-y-4">
                  <div className="flex justify-between items-center border-b border-cyber-border/20 pb-3">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyber-purple flex items-center gap-1.5">
                      <Calendar className="w-4.5 h-4.5" /> Weekly Academic Planner (Mock June 2026)
                    </h3>
                    <span className="text-[10px] text-cyber-text/40 font-mono">CLICK DATE TO SCHEDULE SELECTED CHAPTER</span>
                  </div>

                  {/* Render Calendar grid */}
                  {renderCalendar()}
                </div>

              </div>

            </div>
          )}

          {/* C. TELEMETRY TAB VIEW */}
          {activeTab === 'telemetry' && (
            <div className="space-y-6 text-left">
              {telemetryLoading ? (
                <div className="glass-panel p-16 rounded-2xl border border-cyber-border/30 text-center flex flex-col justify-center items-center space-y-4">
                  <div className="w-12 h-12 border-4 border-cyber-cyan border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-mono text-cyber-cyan animate-pulse">Syncing classroom telemetric matrix...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Classroom KPI Aggregates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* KPI 1 */}
                    <div className="bg-[#0a0a23]/40 backdrop-blur-md p-4 rounded-2xl border border-cyber-border/30 flex items-center justify-between hover:border-cyber-purple/50 transition-colors">
                      <div className="space-y-1">
                        <span className="text-[10px] text-cyber-text/50 uppercase font-mono tracking-wider font-bold">Class Roster</span>
                        <div className="text-2xl font-black text-white font-outfit">
                          {classroomAnalytics.totalStudents || 0} <span className="text-xs font-medium text-cyber-text/50">Students</span>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-cyber-purple/10 border border-cyber-purple/35 flex items-center justify-center text-cyber-purple">
                        <Users className="w-5 h-5" />
                      </div>
                    </div>

                    {/* KPI 2 */}
                    <div className="bg-[#0a0a23]/40 backdrop-blur-md p-4 rounded-2xl border border-cyber-border/30 flex items-center justify-between hover:border-cyber-cyan/50 transition-colors">
                      <div className="space-y-1">
                        <span className="text-[10px] text-cyber-text/50 uppercase font-mono tracking-wider font-bold">Active Today</span>
                        <div className="text-2xl font-black text-cyber-cyan font-outfit">
                          {classroomAnalytics.activeTodayCount || 0} <span className="text-xs font-medium text-cyber-text/50">online</span>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-cyber-cyan/10 border border-cyber-cyan/35 flex items-center justify-center text-cyber-cyan">
                        <Activity className="w-5 h-5 animate-pulse" />
                      </div>
                    </div>

                    {/* KPI 3 */}
                    <div className="bg-[#0a0a23]/40 backdrop-blur-md p-4 rounded-2xl border border-cyber-border/30 flex items-center justify-between hover:border-cyber-pink/50 transition-colors">
                      <div className="space-y-1">
                        <span className="text-[10px] text-cyber-text/50 uppercase font-mono tracking-wider font-bold">Class Avg Streak</span>
                        <div className="text-2xl font-black text-cyber-pink font-outfit flex items-baseline gap-1">
                          {classroomAnalytics.avgStreak || 0} <span className="text-xs font-medium text-cyber-text/50">days</span>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-cyber-pink/10 border border-cyber-pink/35 flex items-center justify-center text-cyber-pink">
                        <Flame className="w-5 h-5 animate-bounce" />
                      </div>
                    </div>

                    {/* KPI 4 */}
                    <div className="bg-[#0a0a23]/40 backdrop-blur-md p-4 rounded-2xl border border-cyber-border/30 flex items-center justify-between hover:border-cyber-yellow/50 transition-colors">
                      <div className="space-y-1">
                        <span className="text-[10px] text-cyber-text/50 uppercase font-mono tracking-wider font-bold">Quiz Accuracy</span>
                        <div className="text-2xl font-black text-cyber-yellow font-outfit">
                          {classroomAnalytics.avgQuizScore || 0}%
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-cyber-yellow/10 border border-cyber-yellow/35 flex items-center justify-center text-cyber-yellow">
                        <Zap className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  {/* Main Grid: Student List & AI Insights */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Student Table */}
                    <div className="lg:col-span-8 glass-panel p-5 rounded-2xl border border-cyber-border/40 shadow-glass flex flex-col space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyber-cyan flex items-center gap-1.5">
                          <GraduationCap className="w-4.5 h-4.5" /> Student Roster Matrix
                        </h3>
                        
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Filter students..."
                            value={studentSearchQuery}
                            onChange={(e) => setStudentSearchQuery(e.target.value)}
                            className="bg-black/40 border border-cyber-border/40 px-3 py-1.5 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyber-purple placeholder-cyber-text/30"
                          />
                          <button
                            onClick={() => setAssignModalOpen(true)}
                            className="py-1.5 px-3 rounded-lg bg-cyber-purple hover:opacity-90 text-white font-bold uppercase font-mono text-[10px] tracking-wider flex items-center gap-1 shadow-glow-purple cursor-pointer transition-all"
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Add Student
                          </button>
                        </div>
                      </div>

                      {assignedStudents.length === 0 ? (
                        <div className="p-12 text-center border border-dashed border-cyber-border/20 rounded-xl bg-black/10">
                          <Users className="w-8 h-8 text-cyber-text/30 mx-auto mb-2" />
                          <p className="text-xs text-cyber-text/60 font-mono">No students assigned to your classroom yet.</p>
                          <p className="text-[10px] text-cyber-text/40 mt-1 font-sans">Use the "+ Add Student" button to link registered student accounts.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left font-mono text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-cyber-border/20 text-cyber-text/45 uppercase tracking-wider">
                                <th className="pb-3 pl-2">Student</th>
                                <th className="pb-3 text-center">XP</th>
                                <th className="pb-3 text-center">Streak</th>
                                <th className="pb-3 text-center">Avg Mastery</th>
                                <th className="pb-3 text-center">Last Active</th>
                                <th className="pb-3 text-right pr-2">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {assignedStudents
                                .filter(s => s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()))
                                .map(student => {
                                  return (
                                    <tr 
                                      key={student.id}
                                      onClick={() => fetchStudentDetails(student.id)}
                                      className="border-b border-cyber-border/10 hover:bg-white/5 transition-colors cursor-pointer group"
                                    >
                                      <td className="py-3.5 pl-2 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-cyber-cyan/15 border border-cyber-cyan/20 flex items-center justify-center font-outfit text-cyber-cyan font-black text-xs">
                                          {student.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                                        </div>
                                        <div className="flex flex-col text-left">
                                          <span className="font-bold text-white group-hover:text-cyber-cyan transition-colors">{student.name}</span>
                                          <span className="text-[9px] text-cyber-text/50">{student.email}</span>
                                        </div>
                                      </td>
                                      <td className="py-3.5 text-center font-bold">
                                        <div className="flex flex-col items-center">
                                          <span className="text-white">{student.xp} <span className="text-[9px] text-cyber-purple/70">XP</span></span>
                                          <span className="text-[8px] bg-cyber-purple/20 text-cyber-purple px-1.5 rounded-full mt-0.5">Lvl {student.level}</span>
                                        </div>
                                      </td>
                                      <td className="py-3.5 text-center">
                                        <div className="inline-flex items-center gap-1">
                                          <Flame className={`w-3.5 h-3.5 ${student.streak > 0 ? 'text-cyber-pink' : 'text-cyber-text/30'}`} />
                                          <span className={student.streak > 0 ? 'text-cyber-pink font-bold' : 'text-cyber-text/40'}>{student.streak}d</span>
                                        </div>
                                      </td>
                                      <td className="py-3.5 text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                          student.avgMastery >= 75 ? 'bg-cyber-cyan/20 text-cyber-cyan' :
                                          student.avgMastery >= 50 ? 'bg-cyber-blue/20 text-cyber-blue' :
                                          'bg-cyber-pink/20 text-cyber-pink'
                                        }`}>
                                          {student.avgMastery}%
                                        </span>
                                      </td>
                                      <td className="py-3.5 text-center text-cyber-text/60">
                                        {student.lastActivity 
                                          ? new Date(student.lastActivity).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) 
                                          : 'Never'}
                                      </td>
                                      <td className="py-3.5 text-right pr-2">
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); fetchStudentDetails(student.id); }}
                                          className="text-[10px] border border-cyber-cyan/30 hover:border-cyber-cyan bg-cyber-cyan/5 text-cyber-cyan px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold uppercase tracking-wider"
                                        >
                                          Details
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Right: AI Insights / Notifications */}
                    <div className="lg:col-span-4 flex flex-col space-y-4">
                      <div className="glass-panel p-5 rounded-2xl border border-cyber-border/40 shadow-glass flex-1 flex flex-col space-y-4">
                        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyber-purple flex items-center gap-1.5">
                          <Cpu className="w-4.5 h-4.5 animate-pulse" /> AI Classroom Insights
                        </h3>

                        <div className="flex-1 flex flex-col space-y-3">
                          {classroomAnalytics.insights.map((insight: any, idx: number) => {
                            let borderCol = "border-cyber-border/20";
                            let bgCol = "bg-white/5";
                            let iconColor = "text-cyber-cyan";
                            if (insight.type === "danger") {
                              borderCol = "border-cyber-pink/30";
                              bgCol = "bg-cyber-pink/5";
                              iconColor = "text-cyber-pink";
                            } else if (insight.type === "warning") {
                              borderCol = "border-cyber-yellow/30";
                              bgCol = "bg-cyber-yellow/5";
                              iconColor = "text-cyber-yellow";
                            } else if (insight.type === "success") {
                              borderCol = "border-emerald-500/20";
                              bgCol = "bg-emerald-500/5";
                              iconColor = "text-emerald-400";
                            }

                            return (
                              <div key={idx} className={`p-3 rounded-xl border ${borderCol} ${bgCol} text-left flex items-start space-x-3 transition-colors hover:bg-white/[0.07]`}>
                                <div className={`shrink-0 mt-0.5 ${iconColor}`}>
                                  {insight.type === 'danger' ? <AlertTriangle className="w-4.5 h-4.5" /> : 
                                   insight.type === 'warning' ? <AlertTriangle className="w-4.5 h-4.5" /> :
                                   insight.type === 'success' ? <CheckCircle2 className="w-4.5 h-4.5" /> :
                                   <Info className="w-4.5 h-4.5 text-cyber-cyan font-bold" />}
                                </div>
                                <span className="font-sans text-[11px] leading-relaxed text-cyber-text">{insight.text}</span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="p-3 bg-[#0a0a23]/60 rounded-xl border border-cyber-border/20 font-mono text-[9px] text-cyber-text/50">
                          <strong>COGNITIVE INSIGHTS ENGINE:</strong> Classroom indexes are calculated per activity log. insights compile performance flags dynamically.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Subject Mastery Classroom Averages */}
                  <div className="glass-panel p-5 rounded-2xl border border-cyber-border/40 shadow-glass text-left space-y-4">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyber-cyan flex items-center gap-1.5">
                      <BarChart2 className="w-4.5 h-4.5" /> Classroom Subject Mastery Index (Averages)
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-2">
                      {["Science", "Mathematics", "Social Science", "English", "Hindi"].map(sub => {
                        const score = classroomAnalytics.subjectAverages?.[sub] || 0;
                        let barCol = "from-cyber-purple to-cyber-pink";
                        let tagCol = "text-cyber-purple";
                        if (sub === "Science") {
                          barCol = "from-emerald-600 to-teal-400";
                          tagCol = "text-emerald-400";
                        } else if (sub === "Mathematics") {
                          barCol = "from-cyber-blue to-cyber-cyan";
                          tagCol = "text-cyber-cyan";
                        } else if (sub === "English") {
                          barCol = "from-cyber-purple to-indigo-500";
                          tagCol = "text-cyber-purple";
                        } else if (sub === "Hindi") {
                          barCol = "from-cyber-yellow to-amber-500";
                          tagCol = "text-cyber-yellow";
                        }

                        return (
                          <div key={sub} className="bg-black/30 p-3 rounded-xl border border-cyber-border/10 flex flex-col justify-between space-y-2">
                            <span className="font-mono text-[10px] text-cyber-text/60 uppercase font-bold truncate">{sub}</span>
                            <div className="flex justify-between items-baseline font-mono font-black mt-1">
                              <span className="text-base text-white">{score}%</span>
                              <span className={`text-[8px] uppercase ${tagCol}`}>Mastery</span>
                            </div>
                            <div className="w-full h-1.5 bg-black/40 rounded-full border border-cyber-border/10 overflow-hidden mt-1">
                              <div 
                                className={`h-full bg-gradient-to-r ${barCol}`} 
                                style={{ width: `${score}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Privacy Disclosure Footer */}
                  <div className="text-[10px] text-cyber-text/65 leading-relaxed bg-[#0a0a23]/40 p-4 rounded-xl border border-cyber-border/10 flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-cyber-cyan shrink-0 animate-pulse" />
                    <span className="font-sans">
                      <strong>PRIVACY STATEMENT:</strong> Student learning telemetry is compiled strictly from completed worksheets, quizzes, Feynman Arena Dialogues, and study units logged on the Vidya AI platform. Real-time client eye-tracking computations are executed sandbox-side and only shared as aggregated anonymous scores.
                    </span>
                  </div>
                </div>
              )}

              {/* MOCK/REAL ASSIGN STUDENT OVERLAY MODAL */}
              {assignModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                  <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-cyber-border shadow-2xl flex flex-col space-y-4">
                    <div className="flex justify-between items-center border-b border-cyber-border/20 pb-3">
                      <h3 className="text-sm font-bold text-white font-outfit uppercase tracking-wider flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-cyber-purple" /> Link Student to Classroom
                      </h3>
                      <button 
                        onClick={() => setAssignModalOpen(false)}
                        className="text-cyber-text/50 hover:text-white transition-colors cursor-pointer text-sm font-bold border border-white/10 hover:border-white/30 px-2 py-0.5 rounded"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-cyber-text/50" />
                      <input
                        type="text"
                        placeholder="Search student by name or email..."
                        value={assignSearchQuery}
                        onChange={(e) => setAssignSearchQuery(e.target.value)}
                        className="w-full bg-black/40 border border-cyber-border/60 pl-9 pr-4 py-2.5 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyber-purple placeholder-cyber-text/30"
                      />
                    </div>

                    <div className="flex-1 max-h-64 overflow-y-auto space-y-2 pr-1">
                      {searchableStudents.filter(s => 
                        s.name.toLowerCase().includes(assignSearchQuery.toLowerCase()) || 
                        s.email.toLowerCase().includes(assignSearchQuery.toLowerCase())
                      ).length === 0 ? (
                        <p className="text-xs text-cyber-text/50 font-mono py-6 text-center">No registered students match your search.</p>
                      ) : (
                        searchableStudents
                          .filter(s => 
                            s.name.toLowerCase().includes(assignSearchQuery.toLowerCase()) || 
                            s.email.toLowerCase().includes(assignSearchQuery.toLowerCase())
                          )
                          .map(student => (
                            <div 
                              key={student.id}
                              className="p-3 bg-black/20 hover:bg-black/35 rounded-xl border border-cyber-border/10 flex items-center justify-between transition-colors"
                            >
                              <div className="text-left font-mono">
                                <h4 className="text-xs font-bold text-white leading-none">{student.name}</h4>
                                <span className="text-[9px] text-cyber-text/50 mt-1 block">{student.email}</span>
                              </div>
                              <button
                                onClick={() => handleAssignStudent(student.id)}
                                disabled={assigningId === student.id}
                                className="text-[10px] font-bold font-mono uppercase bg-cyber-purple hover:bg-opacity-85 text-white py-1 px-3 rounded-lg shadow-glow-purple border border-cyber-purple/50 cursor-pointer disabled:opacity-50 transition-all"
                              >
                                {assigningId === student.id ? "Linking..." : "+ Link"}
                              </button>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STUDENT DETAILED TELEMETRY PROFILE PANEL */}
              {selectedStudentId && (
                <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm">
                  {/* Backdrop click to close */}
                  <div className="absolute inset-0 cursor-pointer" onClick={() => { setSelectedStudentId(null); setSelectedStudentStats(null); }}></div>
                  
                  <div className="relative glass-panel w-full max-w-xl h-screen bg-[#070519]/90 border-l border-cyber-border shadow-2xl flex flex-col p-6 overflow-y-auto space-y-6 animate-slide-in">
                    
                    {/* Header */}
                    <div className="flex justify-between items-center border-b border-cyber-border/20 pb-4">
                      <div className="flex items-center space-x-3 text-left">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyber-cyan to-cyber-blue flex items-center justify-center font-outfit text-white font-black text-sm">
                          {selectedStudentStats?.userName?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'ST'}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white leading-none font-outfit">{selectedStudentStats?.userName || "Loading student..."}</h3>
                          <span className="text-[9px] text-cyber-text/50 font-mono mt-1.5 block">STUDENT PROFILE TELEMETRY</span>
                        </div>
                      </div>

                      <button 
                        onClick={() => { setSelectedStudentId(null); setSelectedStudentStats(null); }}
                        className="text-cyber-text/50 hover:text-white transition-colors cursor-pointer text-sm font-bold border border-white/10 hover:border-white/30 px-3 py-1 rounded"
                      >
                        CLOSE REPORT ✕
                      </button>
                    </div>

                    {studentDetailsLoading ? (
                      <div className="flex-1 flex flex-col justify-center items-center space-y-3 py-12">
                        <div className="w-10 h-10 border-4 border-cyber-purple border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs font-mono text-cyber-purple animate-pulse">Compiling student cognitive metrics...</span>
                      </div>
                    ) : selectedStudentStats ? (
                      <div className="space-y-6">
                        
                        {/* Summary Metrics */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-black/35 p-3 rounded-xl border border-cyber-border/10 text-left flex flex-col justify-between space-y-1.5">
                            <span className="text-[9px] text-cyber-text/50 font-mono uppercase tracking-wider font-bold">Study Experience</span>
                            <div className="text-white font-mono font-bold text-xs">
                              {selectedStudentStats.totalXP} <span className="text-[9px] text-cyber-purple font-normal">XP</span>
                            </div>
                            <span className="text-[8px] bg-cyber-purple/20 text-cyber-purple font-mono px-2 py-0.5 rounded-full w-max">Level {selectedStudentStats.level}</span>
                          </div>

                          <div className="bg-black/35 p-3 rounded-xl border border-cyber-border/10 text-left flex flex-col justify-between space-y-1.5">
                            <span className="text-[9px] text-cyber-text/50 font-mono uppercase tracking-wider font-bold">Daily Streak</span>
                            <div className="text-white font-mono font-bold text-xs flex items-center gap-1">
                              <Flame className="w-3.5 h-3.5 text-cyber-pink" />
                              <span>{selectedStudentStats.weeklyStreak} Days</span>
                            </div>
                            <span className="text-[8px] text-cyber-text/40 font-mono">Consistently learning</span>
                          </div>
                        </div>

                        {/* Subject Mastery Progress Bars */}
                        <div className="glass-panel p-4 rounded-xl border border-cyber-border/20 text-left space-y-3.5">
                          <h4 className="text-[10px] font-mono font-bold text-cyber-cyan uppercase tracking-wider border-b border-cyber-border/10 pb-1.5 flex items-center gap-1">
                            <GraduationCap className="w-4 h-4" /> Concept Mastery Index
                          </h4>
                          <div className="space-y-3 font-mono text-xs">
                            {Object.keys(selectedStudentStats.subjectProgress).map(sub => {
                              const prog = selectedStudentStats.subjectProgress[sub] || 0;
                              return (
                                <div key={sub} className="space-y-1">
                                  <div className="flex justify-between text-[10px]">
                                    <span className="font-bold text-white">{sub}</span>
                                    <span className="text-cyber-cyan font-bold">{prog}%</span>
                                  </div>
                                  <div className="w-full h-2 bg-black/40 rounded-full border border-cyber-border/10 overflow-hidden">
                                    <div 
                                      className="h-full bg-gradient-to-r from-cyber-blue to-cyber-cyan" 
                                      style={{ width: `${prog}%` }}
                                    ></div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Weak Topics Review List */}
                        <div className="glass-panel p-4 rounded-xl border border-cyber-border/20 text-left space-y-3">
                          <h4 className="text-[10px] font-mono font-bold text-cyber-pink uppercase tracking-wider border-b border-cyber-border/10 pb-1.5 flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4" /> Weak Concepts Identified
                          </h4>
                          {selectedStudentStats.weakTopics.length === 0 ? (
                            <p className="text-[10px] text-cyber-text/50 font-mono py-2">No weak topics found! Excellent performance.</p>
                          ) : (
                            <div className="flex flex-col space-y-2.5">
                              {selectedStudentStats.weakTopics.map((wt: any, idx: number) => (
                                <div key={idx} className="p-2.5 rounded-xl border border-cyber-pink/20 bg-cyber-pink/5 flex items-center justify-between text-left font-mono text-[10px]">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-white">{wt.topic}</span>
                                    <span className="text-[8px] text-cyber-text/50 mt-0.5">{wt.subject} • {wt.chapter}</span>
                                  </div>
                                  <span className="font-bold text-cyber-pink bg-cyber-pink/15 px-2 py-0.5 rounded-full">{wt.score}%</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Recent Quiz History */}
                        <div className="glass-panel p-4 rounded-xl border border-cyber-border/20 text-left space-y-3">
                          <h4 className="text-[10px] font-mono font-bold text-cyber-purple uppercase tracking-wider border-b border-cyber-border/10 pb-1.5 flex items-center gap-1">
                            <Award className="w-4.5 h-4.5" /> Recent Quiz Index
                          </h4>
                          {selectedStudentStats.quizAnalytics.recentQuizHistory.length === 0 ? (
                            <p className="text-[10px] text-cyber-text/50 font-mono py-2">No quizzes completed yet.</p>
                          ) : (
                            <div className="flex flex-col space-y-2">
                              {selectedStudentStats.quizAnalytics.recentQuizHistory.map((q: any, idx: number) => (
                                <div key={idx} className="p-2 bg-black/20 rounded-xl border border-cyber-border/10 flex items-center justify-between font-mono text-[10px]">
                                  <div className="flex flex-col text-left">
                                    <span className="font-bold text-white truncate max-w-[280px]">{q.topic}</span>
                                    <span className="text-[8px] text-cyber-text/40 mt-0.5">{q.subject} • {q.date}</span>
                                  </div>
                                  <span className={`font-bold px-2 py-0.5 rounded-full ${
                                    q.score >= 80 ? 'text-emerald-400 bg-emerald-500/10' :
                                    q.score >= 50 ? 'text-cyber-cyan bg-cyber-cyan/10' :
                                    'text-cyber-pink bg-cyber-pink/10'
                                  }`}>{q.score}%</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>
                    ) : (
                      <p className="text-xs text-cyber-text/40 font-mono text-center py-12">Failed to retrieve telemetry profile.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* RIGHT SIDEBAR: AI TEACHING ASSISTANT (no-print) */}
      <aside className={`border-l border-cyber-border bg-[#0a0a23]/60 backdrop-blur-md flex flex-col shrink-0 no-print transition-all duration-300 relative ${
        assistantOpen ? 'w-80' : 'w-12'
      }`}>
        {/* Toggle Button to collapse/expand chatbot */}
        <button
          onClick={() => setAssistantOpen(!assistantOpen)}
          className="absolute -left-3.5 top-5 w-7 h-7 rounded-full bg-cyber-purple border border-cyber-border hover:border-cyber-purple flex items-center justify-center text-white cursor-pointer shadow-glow-purple z-10 hover:scale-105 transition-transform"
        >
          {assistantOpen ? "→" : "←"}
        </button>

        {assistantOpen ? (
          <div className="h-full flex flex-col justify-between">
            
            {/* Header */}
            <div className="p-4 border-b border-cyber-border/20 flex flex-col space-y-1">
              <span className="text-[9px] text-cyber-cyan font-mono font-bold tracking-wider uppercase">COACH PANEL</span>
              <h3 className="text-xs font-bold text-white flex items-center gap-1">
                <MessageSquareCode className="w-4 h-4 text-cyber-cyan animate-pulse" />
                Teaching Assistant
              </h3>
              <p className="text-[9px] text-cyber-text/50 truncate font-mono">{chapter}</p>
            </div>

            {/* Chat Messages Log */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 font-mono text-[10px] max-h-[460px]">
              {currentChat.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded-2xl max-w-[85%] text-left border ${
                    msg.sender === 'user' 
                      ? 'bg-cyber-purple/20 border-cyber-purple ml-auto text-white' 
                      : 'bg-black/40 border-cyber-border/30 text-cyber-text/90'
                  }`}
                >
                  <span className="block font-bold text-[8px] text-cyber-cyan/60 uppercase mb-1">
                    {msg.sender === 'user' ? 'You' : 'Vidya AI Coach'}
                  </span>
                  <p className="leading-relaxed whitespace-pre-wrap font-sans">{msg.text}</p>
                </div>
              ))}

              {chatLoading && (
                <div className="bg-black/40 border border-cyber-border/30 p-3 rounded-2xl max-w-[80%] text-left flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-cyber-cyan animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-cyber-cyan animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-2 h-2 rounded-full bg-cyber-cyan animate-bounce [animation-delay:0.4s]"></div>
                </div>
              )}
            </div>

            {/* Prompt Chips & Input Form */}
            <div className="p-3 border-t border-cyber-border/20 space-y-3 bg-[#0a0a23]/90">
              
              {/* Chips container */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  "How do I explain this simply?",
                  "Create oral questions",
                  "Create a Class Activity",
                  "Generate homework",
                  "Create bilingual explanation"
                ].map(chip => (
                  <button
                    key={chip}
                    type="button"
                    disabled={chatLoading}
                    onClick={() => handleSendMessage(chip)}
                    className="text-[9px] px-2 py-1 rounded-lg border border-cyber-border/40 bg-black/50 hover:bg-cyber-cyan/15 hover:border-cyber-cyan text-cyber-text/70 hover:text-white transition-all cursor-pointer truncate max-w-[280px]"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Chat Form */}
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(chatInput); }}
                className="flex items-center gap-1.5 font-mono"
              >
                <input
                  type="text"
                  value={chatInput}
                  disabled={chatLoading}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask for worksheets, quizzes..."
                  className="flex-1 bg-black/40 border border-cyber-border/70 p-2 rounded-xl text-white text-[10px] focus:outline-none focus:border-cyber-purple placeholder-cyber-text/30"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="p-2 rounded-xl bg-cyber-purple hover:opacity-90 disabled:opacity-50 text-white flex items-center justify-center shrink-0 cursor-pointer shadow-glow-purple"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

          </div>
        ) : (
          <div className="h-full flex flex-col items-center py-6 space-y-6">
            <MessageSquareCode className="w-5 h-5 text-cyber-cyan animate-pulse mt-4" />
            <div className="h-full border-l border-cyber-border/20"></div>
          </div>
        )}
      </aside>

    </div>
  );
};
