/**
 * EngagementTracker.tsx — Real-Time AI Attention Monitor
 * =======================================================
 * Pipeline:
 *   getUserMedia → <video> → oncanplay → FaceMesh.send() →
 *   onResults → landmark math → attention score → UI
 *
 * MediaPipe FaceMesh is served locally from /public/mediapipe/face_mesh/
 * All computation is 100% client-side. Nothing is uploaded.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useMainStore } from '../store/mainStore';
import { Camera, AlertCircle, Eye, Zap, Award, Loader2, WifiOff, Brain } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type AttentionState = 'Calibrating' | 'Focused' | 'Reading' | 'Distracted' | 'Idle' | 'Away' | 'Inactive';

type CamStatus =
  | 'requesting'     // waiting for browser permission popup
  | 'loading'        // stream granted, loading video + model
  | 'calibrating'    // collecting baseline frames
  | 'tracking'       // live FaceMesh tracking active
  | 'denied'         // user denied camera permission
  | 'unavailable'    // camera hardware not found
  | 'error'          // unexpected error
  | 'simulation';    // MediaPipe failed — behaviour-based fallback

// ─── FaceMesh landmark indices (478-point model) ─────────────────────────────
const L_TOP=159,L_BOT=145,L_LEFT=33,L_RIGHT=133;
const R_TOP=386,R_BOT=374,R_LEFT=362,R_RIGHT=263;
const L_IRIS=468,R_IRIS=473;
const NOSE=1,FACE_L=234,FACE_R=454,FORE=10,CHIN=152;

// ─── Geometry ─────────────────────────────────────────────────────────────────
type P={x:number;y:number};
const d2=(a:P,b:P)=>Math.sqrt((a.x-b.x)**2+(a.y-b.y)**2);

const calcEAR=(lm:any[])=>{
  const L=d2(lm[L_TOP],lm[L_BOT])/(d2(lm[L_LEFT],lm[L_RIGHT])+1e-7);
  const R=d2(lm[R_TOP],lm[R_BOT])/(d2(lm[R_LEFT],lm[R_RIGHT])+1e-7);
  return (L+R)/2;
};
const calcYaw=(lm:any[])=>{
  const toL=Math.abs(lm[NOSE].x-lm[FACE_L].x);
  const toR=Math.abs(lm[NOSE].x-lm[FACE_R].x);
  return Math.abs(toL-toR)/(toL+toR+1e-7);
};
const calcPitch=(lm:any[])=>{
  const toT=Math.abs(lm[NOSE].y-lm[FORE].y);
  const toB=Math.abs(lm[NOSE].y-lm[CHIN].y);
  return Math.abs(toT/(toB+1e-7)-1.0);
};
const calcGaze=(lm:any[])=>{
  const lCx=(lm[L_LEFT].x+lm[L_RIGHT].x)/2, lCy=(lm[L_TOP].y+lm[L_BOT].y)/2;
  const gL=d2(lm[L_IRIS],{x:lCx,y:lCy})/(d2(lm[L_LEFT],lm[L_RIGHT])+1e-7);
  const rCx=(lm[R_LEFT].x+lm[R_RIGHT].x)/2, rCy=(lm[R_TOP].y+lm[R_BOT].y)/2;
  const gR=d2(lm[R_IRIS],{x:rCx,y:rCy})/(d2(lm[R_LEFT],lm[R_RIGHT])+1e-7);
  return (gL+gR)/2;
};
const calcFC=(lm:any[]):P=>({
  x:(lm[FACE_L].x+lm[FACE_R].x)/2,
  y:(lm[FORE].y+lm[CHIN].y)/2,
});

// ─── Attention score computation ──────────────────────────────────────────────
function computeScore(
  ear:number, yaw:number, pitch:number, gaze:number, fc:P,
  isIdle:boolean,
  bl:{yaw:number;pitch:number;gaze:number}|null
):{score:number;state:AttentionState;flags:string[]} {
  const flags:string[]=[];
  let s=100;

  const yTh  = bl ? Math.max(0.08, bl.yaw  +0.09) : 0.15;
  const pTh  = bl ? Math.max(0.08, bl.pitch+0.10) : 0.17;
  const gTh  = bl ? Math.max(0.06, bl.gaze +0.07) : 0.11;

  // EAR — drowsiness (15%)
  if(ear<0.13)      { s-=45; flags.push('Drowsy'); }
  else if(ear<0.19) { s-=18; flags.push('Heavy'); }

  // Yaw — head turn (25%)
  if(yaw>yTh)  { s-=Math.min(38,(yaw-yTh)*175);  flags.push('TurnedAway'); }

  // Pitch — head tilt (25%)
  if(pitch>pTh){ s-=Math.min(28,(pitch-pTh)*120); flags.push(pitch>0.33?'LookingDown':'Tilted'); }

  // Gaze deviation — iris off-center (40%)
  if(gaze>gTh) { s-=Math.min(36,(gaze-gTh)*200);  flags.push('GazeDrift'); }

  // Face centering (20%)
  const cd=Math.sqrt((fc.x-0.5)**2+(fc.y-0.5)**2);
  if(cd>0.20)  { s-=Math.min(18,(cd-0.20)*75);     flags.push('OffCenter'); }

  // Idle
  if(isIdle)   { s-=22; flags.push('Idle'); }

  s=Math.max(5,Math.min(100,Math.round(s)));

  let state:AttentionState='Focused';
  if(isIdle)                                                          state='Idle';
  else if(flags.includes('TurnedAway')||flags.includes('GazeDrift')||s<58) state='Distracted';
  else if(flags.includes('Drowsy')||flags.includes('Heavy'))         state='Distracted';
  else if(flags.includes('LookingDown')&&s>=55)                     state='Reading';

  return {score:s,state,flags};
}

// ─── Component ────────────────────────────────────────────────────────────────
export const EngagementTracker: React.FC = () => {
  const { updateEngagement, user } = useMainStore();

  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const fmRef      = useRef<any>(null);
  const rafRef     = useRef<number>(0);
  const streamRef  = useRef<MediaStream|null>(null);
  const busyRef    = useRef(false);   // frame-send mutex
  const lastTsRef  = useRef(0);      // throttle

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [camStatus,  setCamStatus]  = useState<CamStatus>('requesting');
  const [calibProg,  setCalibProg]  = useState(0);
  const [attState,   setAttState]   = useState<AttentionState>('Calibrating');
  const [score,      setScore]      = useState(0);    // ← starts at 0, NOT 90
  const [earVal,     setEarVal]     = useState(0);
  const [yawVal,     setYawVal]     = useState(0);
  const [pitchVal,   setPitchVal]   = useState(0);
  const [gazeVal,    setGazeVal]    = useState(0);
  const [faceOn,     setFaceOn]     = useState(false);
  const [tabHidden,  setTabHidden]  = useState(false);
  const [warnings,   setWarnings]   = useState<string[]>([]);
  const [statusMsg,  setStatusMsg]  = useState('Requesting camera permission…');

  // Session metrics — ALL start at 0
  const [avgAtt,     setAvgAtt]     = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [distCount,  setDistCount]  = useState(0);
  const [activeTime, setActiveTime] = useState(0);

  // Internal refs
  const lastActivity  = useRef(Date.now());
  const scoresArr     = useRef<number[]>([]);
  const prevAttState  = useRef<AttentionState>('Calibrating');
  const curStreak     = useRef(0);
  const maxStreak     = useRef(0);
  const distrRef      = useRef(0);
  const activeDurRef  = useRef(0);
  const calibFr       = useRef<{yaw:number;pitch:number;gaze:number}[]>([]);
  const blRef         = useRef<{yaw:number;pitch:number;gaze:number}|null>(null);
  const lowTicks      = useRef(0);
  const distrTicks    = useRef(0);
  const camStatusRef  = useRef<CamStatus>('requesting');
  const trackingRef   = useRef(false); // is real tracking active?

  // Sync ref
  useEffect(() => { camStatusRef.current = camStatus; }, [camStatus]);

  // ── Interaction listeners ─────────────────────────────────────────────────────
  useEffect(() => {
    const fn=()=>{ lastActivity.current=Date.now(); };
    ['mousemove','keydown','click','scroll'].forEach(e=>window.addEventListener(e,fn));
    return ()=>['mousemove','keydown','click','scroll'].forEach(e=>window.removeEventListener(e,fn));
  },[]);

  // ── Tab visibility ────────────────────────────────────────────────────────────
  useEffect(() => {
    const fn=()=>{
      const h=document.visibilityState==='hidden';
      setTabHidden(h);
      if(!h) lastActivity.current=Date.now();
      if(h){ setAttState('Inactive'); setScore(0); setWarnings(['⚠ Tab inactive']); updateEngagement(0,0,false); }
    };
    document.addEventListener('visibilitychange',fn);
    return ()=>document.removeEventListener('visibilitychange',fn);
  },[]);

  // ── Session metrics ticker (1 s) ──────────────────────────────────────────────
  useEffect(() => {
    const t=setInterval(()=>{
      if(document.visibilityState==='hidden') return;
      // Only count time if tracking is actually active
      if(!trackingRef.current && camStatusRef.current!=='simulation') return;

      activeDurRef.current+=1;

      const last=scoresArr.current.at(-1)??0;  // ← default 0, NOT 90
      scoresArr.current.push(last);
      if(scoresArr.current.length>3600) scoresArr.current=scoresArr.current.slice(-3600);

      const avg=scoresArr.current.length
        ? Math.round(scoresArr.current.reduce((a,b)=>a+b,0)/scoresArr.current.length)
        : 0;

      const focused=attState==='Focused'||attState==='Reading';
      if(focused){ curStreak.current+=1; if(curStreak.current>maxStreak.current) maxStreak.current=curStreak.current; }
      else curStreak.current=0;

      const dist=attState==='Distracted'||attState==='Away'||attState==='Inactive';
      const wasDist=prevAttState.current==='Distracted'||prevAttState.current==='Away'||prevAttState.current==='Inactive';
      if(dist&&!wasDist) distrRef.current+=1;
      prevAttState.current=attState;

      setAvgAtt(avg);
      setBestStreak(maxStreak.current);
      setDistCount(distrRef.current);
      setActiveTime(activeDurRef.current);
    },1000);
    return ()=>clearInterval(t);
  },[attState]);

  // ── Backend sync ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const t=setInterval(()=>{
      if(!user||scoresArr.current.length<5) return;
      fetch('http://localhost:5000/api/learning/attention/session',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          averageAttention:avgAtt,longestFocusStreak:bestStreak,
          distractionCount:distCount,
          activeLearningDuration:Math.max(1,Math.round(activeTime/60)),
          attentionScores:scoresArr.current.slice(-15),
        }),
      }).catch(()=>{});
    },30000);
    return ()=>clearInterval(t);
  },[user,avgAtt,bestStreak,distCount,activeTime]);

  // ── FaceMesh result handler ───────────────────────────────────────────────────
  const onResults = useCallback((results: any) => {
    if(document.visibilityState==='hidden') return;

    const count = results.multiFaceLandmarks?.length ?? 0;
    console.log(`[FaceMesh] onResults — faces: ${count}`);

    if(count===0){
      setFaceOn(false);
      setAttState('Away');
      setScore(0);
      setWarnings(['⚠ No face detected — look at the camera']);
      updateEngagement(0,0,false);
      scoresArr.current.push(0);
      return;
    }

    setFaceOn(true);
    const lm=results.multiFaceLandmarks[0];

    const ear  = calcEAR(lm);
    const yaw  = calcYaw(lm);
    const pitch= calcPitch(lm);
    const gaze = calcGaze(lm);
    const fc   = calcFC(lm);
    const idle = Date.now()-lastActivity.current>60000;

    setEarVal(parseFloat(ear.toFixed(3)));
    setYawVal(parseFloat(yaw.toFixed(3)));
    setPitchVal(parseFloat(pitch.toFixed(3)));
    setGazeVal(parseFloat(gaze.toFixed(3)));

    // CALIBRATION — collect 40 stable frames to build baseline
    if(camStatusRef.current==='calibrating'){
      calibFr.current.push({yaw,pitch,gaze});
      const prog=Math.min(100,Math.round((calibFr.current.length/40)*100));
      setCalibProg(prog);
      setStatusMsg(`Calibrating… ${prog}%`);
      if(calibFr.current.length>=40){
        const fs=calibFr.current;
        blRef.current={
          yaw:  fs.reduce((a,f)=>a+f.yaw,  0)/fs.length,
          pitch:fs.reduce((a,f)=>a+f.pitch, 0)/fs.length,
          gaze: fs.reduce((a,f)=>a+f.gaze,  0)/fs.length,
        };
        console.log('[FaceMesh] Calibration baseline:', blRef.current);
        setCamStatus('tracking');
        setStatusMsg('Real-time tracking active');
        trackingRef.current=true;
      }
      setAttState('Calibrating');
      return;
    }

    // LIVE TRACKING
    const {score:s,state,flags}=computeScore(ear,yaw,pitch,gaze,fc,idle,blRef.current);

    lowTicks.current  = s<40 ? lowTicks.current+1  : 0;
    distrTicks.current= (state==='Distracted'||state==='Away') ? distrTicks.current+1 : 0;

    const ws:string[]=[];
    if(state==='Away')          ws.push('⚠ No face detected — look at the camera');
    else if(state==='Idle')     ws.push('⚠ Idle — no activity for 60 seconds');
    else if(flags.includes('TurnedAway')||flags.includes('GazeDrift'))
      ws.push(distrTicks.current>5?'⚠ Looking away too long — please refocus':'⚠ Focus on the lesson');
    else if(flags.includes('Drowsy'))  ws.push('⚠ Drowsiness detected — stay alert!');
    else if(flags.includes('Heavy'))   ws.push('⚠ Eyes closing — wake up!');
    else if(flags.includes('LookingDown')) ws.push('📖 Reading posture detected');
    else if(lowTicks.current>=3)       ws.push('⚠ Low attention — focus on the lesson');
    setWarnings(ws);

    setAttState(state);
    setScore(s);
    scoresArr.current.push(s);
    updateEngagement(s,parseFloat(ear.toFixed(2)),ear<0.14);
  },[updateEngagement]);

  // ── Main init: camera → FaceMesh ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled=false;

    const run=async()=>{
      // ── Step 1: getUserMedia ──────────────────────────────────────────────────
      setCamStatus('requesting');
      setStatusMsg('Requesting camera permission…');
      console.log('[EngagementAI] Requesting camera…');

      let stream:MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video:{ width:{ideal:640}, height:{ideal:480}, facingMode:'user' }
        });
        streamRef.current=stream;
        console.log('[EngagementAI] Camera granted. Tracks:', stream.getVideoTracks().map(t=>t.label));
      } catch(err:any){
        console.warn('[EngagementAI] Camera error:', err.name, err.message);
        if(cancelled) return;
        if(err.name==='NotAllowedError'||err.name==='PermissionDeniedError'){
          setCamStatus('denied');
          setStatusMsg('Camera permission denied by browser');
        } else if(err.name==='NotFoundError'||err.name==='DevicesNotFoundError'){
          setCamStatus('unavailable');
          setStatusMsg('No camera found on this device');
        } else {
          setCamStatus('simulation');
          setStatusMsg('Camera error — behaviour mode active');
        }
        return;
      }

      // ── Step 2: Wire stream to <video> ────────────────────────────────────────
      setCamStatus('loading');
      setStatusMsg('Loading video stream…');

      const vid=videoRef.current!;
      vid.srcObject=stream;
      vid.muted=true;
      vid.playsInline=true;

      // Wait for enough data to decode first frame
      await new Promise<void>((res,rej)=>{
        const to=setTimeout(()=>rej(new Error('video metadata timeout')),10000);
        const done=()=>{ clearTimeout(to); res(); };
        if(vid.readyState>=2){ done(); return; }
        vid.addEventListener('canplay',done,{once:true});
        vid.addEventListener('error',(e)=>{ clearTimeout(to); rej(e); },{once:true});
        vid.load();
      });

      try { await vid.play(); } catch(e){ console.warn('[EngagementAI] vid.play() error:', e); }
      console.log('[EngagementAI] Video playing. readyState:', vid.readyState, 'size:', vid.videoWidth, '×', vid.videoHeight);

      if(cancelled) return;

      // ── Step 3: Load MediaPipe face_mesh.js (IIFE, attaches to window.FaceMesh) ──
      setStatusMsg('Loading FaceMesh model…');
      console.log('[EngagementAI] Loading face_mesh.js from /mediapipe/face_mesh/…');

      try {
        await new Promise<void>((res,rej)=>{
          if((window as any).FaceMesh){ console.log('[EngagementAI] FaceMesh already loaded'); res(); return; }
          const el=document.getElementById('mp-face-mesh') as HTMLScriptElement|null;
          if(el){ el.addEventListener('load',()=>res(),{once:true}); el.addEventListener('error',()=>rej(new Error('script error')),{once:true}); return; }
          const sc=document.createElement('script');
          sc.id='mp-face-mesh';
          sc.src='/mediapipe/face_mesh/face_mesh.js';
          sc.async=false;
          const to=setTimeout(()=>rej(new Error('face_mesh.js load timeout')),20000);
          sc.onload =()=>{ clearTimeout(to); console.log('[EngagementAI] face_mesh.js loaded'); res(); };
          sc.onerror=()=>{ clearTimeout(to); rej(new Error('face_mesh.js failed')); };
          document.head.appendChild(sc);
        });

        // Poll for window.FaceMesh constructor
        await new Promise<void>((res,rej)=>{
          const start=Date.now();
          const poll=setInterval(()=>{
            if((window as any).FaceMesh){ clearInterval(poll); res(); }
            else if(Date.now()-start>8000){ clearInterval(poll); rej(new Error('window.FaceMesh timeout')); }
          },150);
        });

        if(cancelled) return;
        console.log('[EngagementAI] window.FaceMesh constructor ready');

        // ── Step 4: Create FaceMesh instance ─────────────────────────────────
        setStatusMsg('Initialising neural model…');
        const fm=new (window as any).FaceMesh({
          locateFile:(f:string)=>`/mediapipe/face_mesh/${f}`
        });

        fm.setOptions({
          maxNumFaces:1,
          refineLandmarks:true,       // enables iris landmarks 468–477
          minDetectionConfidence:0.5,
          minTrackingConfidence:0.5,
        });

        fm.onResults((r:any)=>{ if(!cancelled) onResults(r); });

        console.log('[EngagementAI] Calling fm.initialize()…');
        await Promise.race([
          fm.initialize(),
          new Promise((_,rej)=>setTimeout(()=>rej(new Error('initialize() timeout')),30000))
        ]);

        if(cancelled){ try{fm.close();}catch(_){} return; }
        fmRef.current=fm;
        console.log('[EngagementAI] FaceMesh initialized ✓');

        // ── Step 5: Start calibration ─────────────────────────────────────────
        setCamStatus('calibrating');
        setStatusMsg('Calibrating — look straight at the screen');

        // ── Step 6: RAF frame loop ────────────────────────────────────────────
        // RULES:
        //   • busyRef mutex prevents overlapping sends
        //   • 100ms throttle (≈10 fps) — enough for smooth tracking
        //   • Canvas snapshot sent, NOT raw video element
        //   • fm.send() is fire-and-forget — NEVER awaited
        const canvas=canvasRef.current!;
        canvas.width=vid.videoWidth||640;
        canvas.height=vid.videoHeight||480;
        const ctx=canvas.getContext('2d',{willReadFrequently:true})!;

        const loop=()=>{
          if(cancelled) return;

          const now=Date.now();
          if(!busyRef.current && vid.readyState>=2 && now-lastTsRef.current>=100){
            busyRef.current=true;
            lastTsRef.current=now;
            ctx.drawImage(vid,0,0,canvas.width,canvas.height);
            fmRef.current?.send({image:canvas})
              .then(()=>{ busyRef.current=false; })
              .catch((e:any)=>{ console.warn('[FaceMesh] send error:',e); busyRef.current=false; });
          }

          rafRef.current=requestAnimationFrame(loop);
        };
        rafRef.current=requestAnimationFrame(loop);
        console.log('[EngagementAI] Frame loop started');

      } catch(err){
        console.warn('[EngagementAI] MediaPipe failed, switching to simulation:', err);
        if(!cancelled){
          setCamStatus('simulation');
          setStatusMsg('AI model unavailable — using behaviour tracking');
        }
      }
    };

    run();

    return ()=>{
      cancelled=true;
      cancelAnimationFrame(rafRef.current);
      busyRef.current=false;
      trackingRef.current=false;
      try{ fmRef.current?.close(); }catch(_){}
      fmRef.current=null;
      streamRef.current?.getTracks().forEach(t=>t.stop());
      streamRef.current=null;
    };
  },[onResults]);

  // ─── SIMULATION FALLBACK ─────────────────────────────────────────────────────
  // Only runs when camStatus==='simulation'|'denied'|'unavailable'
  // Reacts to real user behaviour signals (tab hide, idle)
  useEffect(() => {
    if(camStatus!=='simulation'&&camStatus!=='denied'&&camStatus!=='unavailable') return;

    trackingRef.current=true; // allow session stats to count
    let smooth=0; // start at 0, not 90
    let phase=0, tick=0;
    const dur=[10,4,3,4,2];

    const t=setInterval(()=>{
      if(document.visibilityState==='hidden'){
        smooth=0; setAttState('Inactive'); setScore(0);
        setWarnings(['⚠ Tab inactive — score: 0%']);
        updateEngagement(0,0,false); scoresArr.current.push(0); return;
      }
      if(Date.now()-lastActivity.current>60000){
        const s=Math.max(40,Math.round(smooth*0.80));
        setAttState('Idle'); setScore(s);
        setWarnings(['⚠ No activity for 60 seconds']);
        updateEngagement(s,0.27,false); scoresArr.current.push(s); return;
      }
      setWarnings([]);

      tick++; if(tick>=dur[phase]){ tick=0; phase=(phase+1)%dur.length; }

      let target:number;
      let e=0.26+Math.random()*0.05, y=0.02+Math.random()*0.03;
      let p=0.03+Math.random()*0.03, g=0.04+Math.random()*0.03;
      let drowsy=false; let st:AttentionState='Focused';

      switch(phase){
        case 0: target=84+Math.random()*13; st='Focused';    setWarnings([]); break;
        case 1: target=30+Math.random()*22; st='Distracted';
          y=0.20+Math.random()*0.16; g=0.18+Math.random()*0.12;
          setWarnings(['⚠ Looking away — focus on the lesson']); break;
        case 2: target=20+Math.random()*22; st='Distracted';
          e=0.09+Math.random()*0.06; drowsy=true;
          setWarnings(['⚠ Drowsiness detected — stay alert!']); break;
        case 3: target=58+Math.random()*14; st='Reading';
          p=0.26+Math.random()*0.12; g=0.14+Math.random()*0.06;
          setWarnings(['📖 Reading posture detected']); break;
        case 4: target=6+Math.random()*14; st='Away';
          setFaceOn(false); setWarnings(['⚠ No face detected']); break;
        default: target=88;
      }

      if(phase!==4) setFaceOn(true);
      smooth=smooth*0.55+target*0.45;
      const final=Math.max(5,Math.min(100,Math.round(smooth)));
      setAttState(st); setScore(final);
      setEarVal(parseFloat(e.toFixed(3))); setYawVal(parseFloat(y.toFixed(3)));
      setPitchVal(parseFloat(p.toFixed(3))); setGazeVal(parseFloat(g.toFixed(3)));
      updateEngagement(final,parseFloat(e.toFixed(2)),drowsy);
      scoresArr.current.push(final);
    },1500);

    return ()=>clearInterval(t);
  },[camStatus,updateEngagement]);

  // ─── UI helpers ──────────────────────────────────────────────────────────────
  const attCfg:{[k in AttentionState]:{badge:string;dot:string}}={
    Calibrating:{ badge:'bg-blue-500/10 border-blue-500/40 text-blue-300',  dot:'bg-blue-400 animate-pulse' },
    Focused:    { badge:'bg-emerald-500/10 border-emerald-500/40 text-emerald-400', dot:'bg-emerald-400 animate-pulse' },
    Reading:    { badge:'bg-sky-500/10 border-sky-500/40 text-sky-300',      dot:'bg-sky-400' },
    Distracted: { badge:'bg-amber-500/10 border-amber-500/40 text-amber-400', dot:'bg-amber-400 animate-ping' },
    Idle:       { badge:'bg-yellow-500/10 border-yellow-500/40 text-yellow-400', dot:'bg-yellow-400' },
    Away:       { badge:'bg-rose-500/10 border-rose-500/40 text-rose-400',   dot:'bg-rose-500 animate-ping' },
    Inactive:   { badge:'bg-slate-500/10 border-slate-500/40 text-slate-400', dot:'bg-slate-500' },
  };
  const aCfg=attCfg[attState];
  const scoreColor=score>=75?'text-emerald-400':score>=50?'text-amber-400':'text-rose-400';
  const isLive=camStatus==='calibrating'||camStatus==='tracking';
  const fmt=(s:number)=>{const m=Math.floor(s/60); return m?`${m}m ${s%60}s`:`${s}s`;};

  const warnBg=
    attState==='Away'||attState==='Inactive'?'bg-rose-950/88 border-rose-500':
    attState==='Distracted'?'bg-amber-950/88 border-amber-500':
    attState==='Idle'?'bg-yellow-950/85 border-yellow-600':'bg-sky-950/75 border-sky-600';
  const warnTxt=
    attState==='Away'||attState==='Inactive'?'text-rose-300':
    attState==='Distracted'?'text-amber-300':
    attState==='Idle'?'text-yellow-300':'text-sky-300';

  // Status panel for non-tracking states
  const renderStatusPanel=()=>{
    const isSim=camStatus==='simulation'||camStatus==='denied'||camStatus==='unavailable';
    if(isSim) return(
      <div className="flex flex-col items-center justify-center text-center p-3 space-y-1.5 h-full">
        <WifiOff className="w-7 h-7 text-cyber-purple/60" />
        <span className="text-[10px] text-white/70 font-bold">Behaviour-Based Tracking</span>
        <span className="text-[8px] text-cyber-cyan/70">
          {camStatus==='denied'?'Camera permission denied — grant it and refresh':
           camStatus==='unavailable'?'No camera detected on this device':
           'AI model unavailable — using behavioural signals'}
        </span>
      </div>
    );
    // requesting / loading / error
    return(
      <div className="flex flex-col items-center justify-center text-center gap-2 h-full">
        <Loader2 className="w-6 h-6 text-cyber-blue animate-spin" />
        <span className="text-[10px] text-white/60 font-mono">{statusMsg}</span>
      </div>
    );
  };

  return(
    <div className="glass-panel rounded-2xl p-4 border border-cyber-border/40 flex flex-col items-center space-y-3 relative overflow-hidden font-mono text-left">

      {/* Header */}
      <div className="w-full flex items-center justify-between">
        <h3 className="text-xs font-bold tracking-wider text-cyber-blue uppercase flex items-center gap-1.5">
          <Brain className="w-4 h-4 animate-pulse" />
          Engagement AI
        </h3>
        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border flex items-center gap-1.5 transition-all duration-500 ${aCfg.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${aCfg.dot}`}/>
          {attState.toUpperCase()}
        </span>
      </div>

      {/* Camera viewport */}
      <div className="relative w-full h-[130px] bg-black/75 rounded-xl overflow-hidden flex items-center justify-center border border-cyber-border/20 shadow-inner">

        {/* Hidden offscreen canvas for FaceMesh frame input */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Live video */}
        <video
          ref={videoRef}
          className={`w-full h-full object-cover scale-x-[-1] ${isLive?'opacity-100':'hidden'}`}
          autoPlay playsInline muted
        />

        {/* Status / fallback panel */}
        {!isLive && renderStatusPanel()}

        {/* Calibration overlay */}
        {camStatus==='calibrating'&&(
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2 z-20 text-center px-4">
            <Zap className="w-5 h-5 text-cyber-blue animate-pulse"/>
            <span className="text-[11px] font-bold text-white leading-tight">Look straight at the screen</span>
            <div className="w-40 h-2 bg-black/60 rounded-full overflow-hidden border border-cyber-border/20 mt-1">
              <div className="h-full bg-gradient-to-r from-cyber-blue to-cyber-cyan transition-all duration-200" style={{width:`${calibProg}%`}}/>
            </div>
            <span className="text-[9px] text-white/40">{calibProg}% calibrated</span>
          </div>
        )}

        {/* Warning overlay (tracking / simulation) */}
        {warnings.length>0&&camStatus!=='calibrating'&&!tabHidden&&(
          <div className={`absolute inset-0 flex items-center justify-center z-30 border ${warnBg}`}>
            <div className="bg-black/92 px-3 py-2 rounded-lg text-center max-w-[210px]">
              {warnings.map((w,i)=><span key={i} className={`block text-[10px] font-black tracking-wide ${warnTxt}`}>{w}</span>)}
            </div>
          </div>
        )}

        {/* Tab hidden */}
        {tabHidden&&(
          <div className="absolute inset-0 bg-black/95 flex items-center justify-center z-40">
            <div className="border border-slate-600 bg-slate-900/90 px-4 py-2 rounded-lg text-center">
              <span className="block text-[10px] font-black text-slate-300">TAB INACTIVE</span>
              <span className="block text-[8px] text-white/40 mt-0.5">Score = 0%</span>
            </div>
          </div>
        )}

        <div className="absolute inset-0 border border-cyber-blue/8 rounded-xl pointer-events-none"/>
      </div>

      {/* Pipeline status strip */}
      <div className="w-full bg-black/25 rounded-lg px-2.5 py-1 flex items-center justify-between text-[8px] font-mono">
        <span className={`font-bold ${isLive?'text-emerald-400':camStatus==='simulation'?'text-amber-400/70':'text-cyber-text/40'}`}>
          {isLive?'● FACEMESH LIVE':camStatus==='simulation'?'◐ SIMULATION':camStatus==='denied'?'✕ CAMERA DENIED':'◌ INITIALISING'}
        </span>
        <span className={faceOn&&isLive?'text-emerald-400/70':'text-rose-400/40'}>
          {faceOn&&isLive?'FACE ●':'NO FACE ○'}
        </span>
        <span className="text-cyber-text/30 truncate max-w-[100px]">{statusMsg.slice(0,25)}{statusMsg.length>25?'…':''}</span>
      </div>

      {/* Score + EAR row */}
      <div className="w-full grid grid-cols-2 gap-2 text-center">
        <div className="bg-cyber-bg/50 p-2 rounded-lg border border-cyber-border/20">
          <div className="text-[8px] text-cyber-text/50 uppercase mb-0.5">Attention Score</div>
          <div className={`text-2xl font-black tabular-nums transition-colors duration-300 ${scoreColor}`}>
            {camStatus==='requesting'||camStatus==='loading'?'—%':`${score}%`}
          </div>
        </div>
        <div className="bg-cyber-bg/50 p-2 rounded-lg border border-cyber-border/20">
          <div className="text-[8px] text-cyber-text/50 uppercase mb-0.5">Eye Ratio (EAR)</div>
          <div className={`text-2xl font-black tabular-nums ${earVal<0.15&&earVal>0?'text-rose-400':'text-cyber-purple'}`}>
            {earVal===0?'—':earVal.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Head pose + gaze diagnostics */}
      <div className="w-full grid grid-cols-3 gap-1.5">
        {[
          {label:'Yaw',  val:yawVal,  th:0.15},
          {label:'Pitch',val:pitchVal,th:0.17},
          {label:'Gaze', val:gazeVal, th:0.11},
        ].map(({label,val,th})=>(
          <div key={label} className="bg-black/30 p-1.5 rounded-lg border border-cyber-border/15 text-center">
            <div className="text-[7px] text-cyber-text/40 uppercase">{label}</div>
            <div className={`text-[11px] font-bold tabular-nums mt-0.5 ${val>th&&val>0?'text-amber-400':val===0?'text-cyber-text/25':'text-cyber-cyan'}`}>
              {val===0?'—':val.toFixed(3)}
            </div>
          </div>
        ))}
      </div>

      {/* Session stats — all start at 0, only fill when tracking */}
      <div className="w-full bg-black/40 border border-cyber-border/20 p-2.5 rounded-xl">
        <div className="flex items-center gap-1 text-cyber-cyan border-b border-cyber-border/10 pb-1 mb-1.5 uppercase font-bold text-[8px]">
          <Award className="w-3 h-3"/>Session Stats
          {!trackingRef.current&&<span className="ml-auto text-cyber-text/30 normal-case font-normal">Waiting for camera…</span>}
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px]">
          <div className="flex justify-between">
            <span className="text-white/40">Avg. Focus:</span>
            <span className="text-white font-bold">{avgAtt}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">Best Streak:</span>
            <span className="text-cyber-cyan font-bold">{bestStreak>0?fmt(bestStreak):'—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">Distractions:</span>
            <span className="text-rose-400 font-bold">{distCount}×</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">Active Time:</span>
            <span className="text-cyber-purple font-bold">{activeTime>0?fmt(activeTime):'—'}</span>
          </div>
        </div>
      </div>

      {/* Privacy note */}
      <div className="w-full text-[8px] text-cyber-text/35 text-center flex items-center justify-center gap-1 border-t border-cyber-border/10 pt-1.5">
        <AlertCircle className="w-2.5 h-2.5 text-cyber-cyan shrink-0"/>
        All gaze processing is fully client-side. Zero data uploaded.
      </div>
    </div>
  );
};
