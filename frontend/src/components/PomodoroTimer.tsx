import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMainStore } from '../store/mainStore';
import { Timer, Play, Pause, RotateCcw, X, Minimize2, ChevronUp } from 'lucide-react';
import confetti from 'canvas-confetti';

const WORK_MINS = 25;
const BREAK_MINS = 5;
const LONG_BREAK_MINS = 15;

type Phase = 'work' | 'break' | 'longBreak';

interface PomodoroTimerProps {
  inline?: boolean;
}

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ inline = false }) => {
  const { updateXP } = useMainStore();
  const [isOpen, setIsOpen] = useState(inline ? true : false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [phase, setPhase] = useState<Phase>('work');
  const [seconds, setSeconds] = useState(WORK_MINS * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [showXP, setShowXP] = useState(false);
  const [xpAmount, setXpAmount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<AudioContext | null>(null);


  const totalSeconds = phase === 'work' ? WORK_MINS * 60 : phase === 'break' ? BREAK_MINS * 60 : LONG_BREAK_MINS * 60;
  const progress = ((totalSeconds - seconds) / totalSeconds) * 100;
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');

  const phaseConfig = {
    work:      { label: 'Focus Time',   color: '#00f2fe', bg: 'from-blue-900/40 to-cyan-900/40',   ring: '#00f2fe' },
    break:     { label: 'Short Break',  color: '#00f5d4', bg: 'from-green-900/40 to-emerald-900/40', ring: '#00f5d4' },
    longBreak: { label: 'Long Break',   color: '#9b5de5', bg: 'from-purple-900/40 to-violet-900/40', ring: '#9b5de5' },
  };

  const playBeep = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = phase === 'work' ? 440 : 523;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.8);
    } catch {}
  }, [phase]);

  const handleComplete = useCallback(() => {
    setIsRunning(false);
    playBeep();

    if (phase === 'work') {
      const newSessions = sessions + 1;
      setSessions(newSessions);
      const xp = newSessions % 4 === 0 ? 50 : 20;
      updateXP(xp);
      setXpAmount(xp);
      setShowXP(true);
      setTimeout(() => setShowXP(false), 3000);

      confetti({
        particleCount: newSessions % 4 === 0 ? 120 : 60,
        spread: 70,
        colors: ['#00f2fe', '#9b5de5', '#00f5d4'],
        origin: { y: 0.7 }
      });

      const nextPhase = newSessions % 4 === 0 ? 'longBreak' : 'break';
      setPhase(nextPhase);
      setSeconds(nextPhase === 'longBreak' ? LONG_BREAK_MINS * 60 : BREAK_MINS * 60);
    } else {
      setPhase('work');
      setSeconds(WORK_MINS * 60);
    }
  }, [phase, sessions, updateXP, playBeep]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            handleComplete();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, handleComplete]);

  // Keyboard shortcut: P to toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'p' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        setIsOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const reset = () => {
    setIsRunning(false);
    setSeconds(phase === 'work' ? WORK_MINS * 60 : phase === 'break' ? BREAK_MINS * 60 : LONG_BREAK_MINS * 60);
  };

  const cfg = phaseConfig[phase];
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <>
      {/* Floating toggle button */}
      {!inline && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-cyber-blue to-cyber-purple shadow-glow-blue flex items-center justify-center hover:scale-110 transition-transform cursor-pointer border border-cyber-blue/50"
          title="Open Pomodoro Timer (press P)"
        >
          <Timer className="w-6 h-6 text-white" />
          {isRunning && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-black animate-pulse" />
          )}
        </button>
      )}

      {/* XP toast */}
      {showXP && (
        <div className="fixed bottom-24 right-6 z-50 bg-cyber-blue/90 text-white px-4 py-2 rounded-2xl font-mono font-bold text-sm shadow-glow-blue animate-bounce border border-cyber-cyan/50">
          🎯 +{xpAmount} XP — Pomodoro Complete!
        </div>
      )}

      {/* Timer panel */}
      {isOpen && (
        <div className={`${inline ? 'relative w-full' : 'fixed bottom-6 right-6 z-50 w-72'} rounded-3xl border border-cyber-border/60 shadow-2xl overflow-hidden font-mono`}
          style={{ background: 'linear-gradient(135deg, rgba(10,12,25,0.98) 0%, rgba(20,15,40,0.98) 100%)' }}>

          {/* Header */}
          <div className={`bg-gradient-to-r ${cfg.bg} px-4 py-3 flex items-center justify-between border-b border-cyber-border/30`}>
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4" style={{ color: cfg.color }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: cfg.color }}>{cfg.label}</span>
              {isRunning && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setIsMinimized(m => !m)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer">
                {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              {!inline && (
                <button onClick={() => { setIsOpen(false); setIsRunning(false); }} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {!isMinimized && (
            <div className="p-5 flex flex-col items-center gap-4">

              {/* SVG Ring + time */}
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r="54" fill="none"
                    stroke={cfg.ring} strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                  />
                </svg>
                <div className="text-center z-10">
                  <div className="text-3xl font-black text-white tracking-wider">{mins}:{secs}</div>
                  <div className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: cfg.color }}>
                    {sessions} session{sessions !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {/* Phase selector */}
              <div className="flex w-full gap-1.5">
                {(['work', 'break', 'longBreak'] as Phase[]).map(p => (
                  <button key={p} onClick={() => { setPhase(p); setIsRunning(false); setSeconds(p === 'work' ? WORK_MINS * 60 : p === 'break' ? BREAK_MINS * 60 : LONG_BREAK_MINS * 60); }}
                    className={`flex-1 py-1.5 rounded-lg text-[9px] uppercase font-bold tracking-wider border cursor-pointer transition-all ${
                      phase === p
                        ? 'text-black border-transparent'
                        : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
                    }`}
                    style={phase === p ? { backgroundColor: phaseConfig[p].color, borderColor: phaseConfig[p].color } : {}}>
                    {p === 'work' ? '25m' : p === 'break' ? '5m' : '15m'}
                  </button>
                ))}
              </div>

              {/* Controls */}
              <div className="flex gap-3 w-full justify-center">
                <button onClick={reset} className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer">
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsRunning(r => !r)}
                  className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all border"
                  style={{ backgroundColor: cfg.color + '22', borderColor: cfg.color + '66', color: cfg.color }}
                >
                  {isRunning ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> {seconds === totalSeconds ? 'Start' : 'Resume'}</>}
                </button>
              </div>

              {/* XP hint */}
              <p className="text-[9px] text-white/30 text-center">
                🎯 Complete a session to earn <span style={{ color: cfg.color }}>+20 XP</span> · Every 4th session: <span className="text-cyber-purple">+50 XP</span>
              </p>
            </div>
          )}

          {/* Minimized mode: just the time */}
          {isMinimized && (
            <div className="px-4 py-2 flex items-center justify-between">
              <span className="text-lg font-black text-white">{mins}:{secs}</span>
              <button onClick={() => setIsRunning(r => !r)} className="p-1.5 rounded-lg cursor-pointer" style={{ color: cfg.color }}>
                {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};
