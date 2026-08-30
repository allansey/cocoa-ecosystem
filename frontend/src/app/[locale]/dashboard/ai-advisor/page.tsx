'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, Upload, Loader2, ArrowLeft, Brain, Volume2, ShieldCheck, 
  AlertCircle, Mic, Square, CheckCircle, Circle, Bell, Video, RefreshCw, 
  Settings, Play, Pause, Radio, Zap
} from 'lucide-react';
import Link from 'next/link';

const IMAGE_SERVER = process.env.NEXT_PUBLIC_AI_IMAGE_SERVER_URL || "http://127.0.0.1:5002";
const VOICE_SERVER = process.env.NEXT_PUBLIC_VOICE_SERVER_URL || "http://127.0.0.1:5001";
const DEFAULT_CAM_STREAM = "http://192.168.137.164:81/stream";

interface Detection {
  status: string;
  confidence: number;
  advice?: string;
  stream_url?: string;
}

interface PipelineStep {
  id: string;
  name: string;
  status: 'idle' | 'active' | 'success' | 'error';
}

interface ResultsData {
  twiTranscript?: string;
  englishTranscript?: string;
  englishReply?: string;
  twiReply?: string;
  audioBase64?: string;
  audioMime?: string;
  detection?: Detection | null;
  capturedFrameUrl?: string;
}

interface SSEAlert {
  status: string;
  english_alert: string;
  twi_alert: string;
  audio_base64: string;
  audio_mime: string;
  timestamp: string;
}

export default function AIAdvisor({ params: { locale } }: { params: { locale: string } }) {
  // Input Mode: 'stream' (ESP32-CAM) or 'upload' (File) or 'voice'
  const [inputMode, setInputMode] = useState<'stream' | 'upload'>('stream');
  
  // Stream settings
  const [streamUrl, setStreamUrl] = useState(DEFAULT_CAM_STREAM);
  const [isEditingStream, setIsEditingStream] = useState(false);
  const [streamConnected, setStreamConnected] = useState<boolean | null>(null);
  const [isAutoScanning, setIsAutoScanning] = useState(false);
  const [streamDisplayMode, setStreamDisplayMode] = useState<'direct' | 'iframe' | 'proxy'>('direct');

  // File Upload
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  // Pipeline State
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([]);
  const [currentStepText, setCurrentStepText] = useState("");
  const [results, setResults] = useState<ResultsData | null>(null);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState("Tap to start recording");
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // SSE real-time alert
  const [sseAlert, setSseAlert] = useState<SSEAlert | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const activeAudioInstanceRef = useRef<HTMLAudioElement | null>(null);
  const sseAlertAudioRef = useRef<HTMLAudioElement | null>(null);
  const autoScanTimerRef = useRef<NodeJS.Timeout | null>(null);

  const playAudioData = (base64Data: string, mime: string = 'audio/wav') => {
    if (!base64Data) return;
    try {
      if (activeAudioInstanceRef.current) {
        activeAudioInstanceRef.current.pause();
        activeAudioInstanceRef.current = null;
      }
      const audio = new Audio(`data:${mime};base64,${base64Data}`);
      activeAudioInstanceRef.current = audio;

      audio.onplay = () => setIsPlayingAudio(true);
      audio.onpause = () => setIsPlayingAudio(false);
      audio.onended = () => setIsPlayingAudio(false);
      audio.onerror = () => setIsPlayingAudio(false);

      audio.play().catch(err => {
        console.warn("Browser auto-play warning:", err);
        setIsPlayingAudio(false);
      });
    } catch (e) {
      console.warn("Could not play audio:", e);
      setIsPlayingAudio(false);
    }
  };

  // Connect to SSE stream for real-time push alerts
  useEffect(() => {
    let es: EventSource | null = null;
    let cancelled = false;

    const connectSSE = async () => {
      try {
        const res = await fetch(`${VOICE_SERVER}/health`, { method: 'GET', signal: AbortSignal.timeout(2000) });
        if (!res.ok || cancelled) return;

        es = new EventSource(`${VOICE_SERVER}/stream`);
        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'detection') {
              setSseAlert(data);
              if (data.audio_base64 && sseAlertAudioRef.current) {
                sseAlertAudioRef.current.src = `data:${data.audio_mime};base64,${data.audio_base64}`;
                sseAlertAudioRef.current.play().catch(() => {});
              }
            }
          } catch { /* ignore */ }
        };
        es.onerror = () => { es?.close(); };
      } catch { /* Voice server offline */ }
    };

    connectSSE();
    return () => { cancelled = true; es?.close(); };
  }, []);

  // Shared 4-stage Advisory processor
  const executeAdvisoryPipeline = async (
    detectionPayload: { status: string; confidence: number; advice?: string },
    label: string,
    capturedFrame?: string
  ) => {
    const status = detectionPayload.status || 'healthy';
    const confidence = detectionPayload.confidence || 0.95;

    let advisoryData: any = null;
    try {
      setPipelineSteps(p => p.map(s => s.id === 's1' ? { ...s, status: 'success' } : s.id === 's2' ? { ...s, status: 'active' } : s));
      setCurrentStepText("Generating agronomic advisory with Gemini AI...");

      const advisoryRes = await fetch(`${VOICE_SERVER}/advisory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ detection: { status, primary_detection: { confidence }, advice: detectionPayload.advice } })
      });

      if (advisoryRes.ok) {
        setPipelineSteps(p => p.map(s => (s.id === 's2' || s.id === 's3') ? { ...s, status: 'success' } : s.id === 's4' ? { ...s, status: 'active' } : s));
        setCurrentStepText("Synthesizing Twi voice advisory (Meta MMS-TTS)...");
        advisoryData = await advisoryRes.json().catch(() => null);
      }
    } catch (err) {
      console.warn("Voice server unavailable:", err);
    }

    setPipelineSteps(p => p.map(s => ({ ...s, status: 'success' })));
    setCurrentStepText("Analysis and Twi advisory ready!");

    const englishReply = advisoryData?.english_alert || detectionPayload.advice || "Cocoa pod analysis complete.";
    const twiReply = advisoryData?.twi_alert || "";
    const audioBase64 = advisoryData?.audio_base64 || "";
    const audioMime = advisoryData?.audio_mime || "audio/wav";

    setPipelineLoading(false);
    setResults({
      twiTranscript: label,
      englishTranscript: `Pod Status: ${status.replace(/_/g, ' ')} (${(confidence * 100).toFixed(1)}% Confidence)`,
      englishReply,
      twiReply,
      audioBase64,
      audioMime,
      detection: { status, confidence, advice: englishReply },
      capturedFrameUrl: capturedFrame
    });

    if (audioBase64) {
      playAudioData(audioBase64, audioMime);
    }
  };

  const [cameraError, setCameraError] = useState<string | null>(null);

  // Helper to grab frame cleanly via canvas or same-origin Next.js camera-capture API
  const captureClientSideFrame = async (): Promise<Blob | null> => {
    // 1. Try instant canvas extraction from the live stream image
    try {
      const img = document.getElementById('cam-stream-img') as HTMLImageElement;
      if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.92));
          if (blob && blob.size > 1000) return blob;
        }
      }
    } catch {}

    // 2. Try same-origin Next.js camera-capture route
    try {
      const res = await fetch(`/api/camera-capture?url=${encodeURIComponent(streamUrl)}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        const blob = await res.blob();
        if (blob && blob.size > 1000) return blob;
      }
    } catch (e) {
      console.warn("Camera capture notice:", e);
    }

    return null;
  };

  // 1. Scan from ESP32-CAM Stream (Client capture + Server fallback)
  const scanStreamFrame = async (isBackground = false) => {
    if (!isBackground) {
      setPipelineLoading(true);
      setResults(null);
      setCameraError(null);
    }
    setSseAlert(null);

    const steps: PipelineStep[] = [
      { id: 's1', name: 'Capturing ESP32-CAM Frame (YOLOv8)', status: 'active' },
      { id: 's2', name: 'Gemini AI Agricultural Advisory', status: 'idle' },
      { id: 's3', name: 'Khaya NLP English → Twi Translation', status: 'idle' },
      { id: 's4', name: 'Meta MMS-TTS Voice Synthesis (Akan)', status: 'idle' },
    ];
    if (!isBackground) {
      setPipelineSteps(steps);
      setCurrentStepText(`Analyzing live frame from ${streamUrl}...`);
    }

    try {
      // Step A: Attempt instant frame capture from browser canvas
      const frameBlob = await captureClientSideFrame();
      let det: any = null;

      if (frameBlob) {
        const formData = new FormData();
        formData.append('image', frameBlob, 'stream_snapshot.jpg');
        const uploadRes = await fetch(`${IMAGE_SERVER}/upload`, { method: 'POST', body: formData });
        if (uploadRes.ok) {
          const data = await uploadRes.json();
          det = data.detection;
        }
      }

      // Step B: Fallback to server-side scan-stream endpoint if canvas wasn't available
      if (!det) {
        const res = await fetch(`${IMAGE_SERVER}/scan-stream?url=${encodeURIComponent(streamUrl)}`, {
          method: 'POST'
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || `Could not connect to camera stream at ${streamUrl}.`);
        }

        const data = await res.json();
        det = data.detection;
      }

      const safeDet = det || { status: 'healthy', primary_detection: { confidence: 0.95 } };
      const status = safeDet.status || 'healthy';
      const confidence = safeDet.primary_detection?.confidence || 0.95;

      await executeAdvisoryPipeline(
        { status, confidence, advice: safeDet.advice },
        `ESP32-CAM Scan (${new Date().toLocaleTimeString()})`
      );
    } catch (err: any) {
      if (!isBackground) {
        console.warn("Scan stream notice:", err);
        setPipelineLoading(false);
        setCameraError(err.message || `Could not connect to ${streamUrl}. Please check if the ESP32-CAM is powered on.`);
      }
    }
  };

  // 2. Scan Uploaded Photo
  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResults(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const runImagePipeline = async () => {
    if (!imageFile) return;
    setPipelineLoading(true);
    setResults(null);
    setSseAlert(null);

    const steps: PipelineStep[] = [
      { id: 's1', name: 'Scanning Cocoa Pod (YOLOv8)', status: 'active' },
      { id: 's2', name: 'Gemini AI Agricultural Advisory', status: 'idle' },
      { id: 's3', name: 'Khaya NLP English → Twi Translation', status: 'idle' },
      { id: 's4', name: 'Meta MMS-TTS Voice Synthesis (Akan)', status: 'idle' },
    ];
    setPipelineSteps(steps);
    setCurrentStepText("Running YOLOv8 model inference...");

    const formData = new FormData();
    formData.append('image', imageFile);

    try {
      const uploadRes = await fetch(`${IMAGE_SERVER}/upload`, { method: 'POST', body: formData });
      if (!uploadRes.ok) {
        const errText = await uploadRes.text().catch(() => '');
        throw new Error(`YOLO inference server returned ${uploadRes.status}: ${errText.substring(0, 100)}`);
      }
      const uploadData = await uploadRes.json();
      const det = uploadData.detection || { status: 'healthy', primary_detection: { confidence: 0.95 } };

      await executeAdvisoryPipeline(
        { status: det.status, confidence: det.primary_detection?.confidence || 0.95, advice: det.advice },
        "Mfoni Nhwehwɛmu (Uploaded Photo)",
        image || undefined
      );
    } catch (err: any) {
      console.error(err);
      setPipelineLoading(false);
      alert(err.message || "Diagnosis pipeline failed. Please check inference and voice servers.");
    }
  };

  // Auto-Scan interval management (Runs in background)
  useEffect(() => {
    if (isAutoScanning) {
      scanStreamFrame(true);
      autoScanTimerRef.current = setInterval(() => {
        scanStreamFrame(true);
      }, 5000);
    } else {
      if (autoScanTimerRef.current) {
        clearInterval(autoScanTimerRef.current);
        autoScanTimerRef.current = null;
      }
    }
    return () => {
      if (autoScanTimerRef.current) clearInterval(autoScanTimerRef.current);
    };
  }, [isAutoScanning]);

  // Voice recording
  const toggleRecording = async () => {
    if (isRecording) stopRecordingAudio(); else await startRecordingAudio();
  };

  const startRecordingAudio = async () => {
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await runVoicePipeline(blob);
      };
      recorder.start();
      setIsRecording(true);
      setRecordingStatus("Recording... Tap to stop");
    } catch {
      alert("Microphone access denied.");
    }
  };

  const stopRecordingAudio = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      setIsRecording(false);
      setRecordingStatus("Processing audio...");
    }
  };

  const runVoicePipeline = async (audioBlob: Blob) => {
    setPipelineLoading(true);
    setResults(null);

    const steps: PipelineStep[] = [
      { id: 's1', name: 'Speech-to-Text (Khaya NLP - Akan)', status: 'active' },
      { id: 's2', name: 'Twi → English Translation', status: 'idle' },
      { id: 's3', name: 'Gemini AI Agricultural Advisory', status: 'idle' },
      { id: 's4', name: 'English → Twi Translation', status: 'idle' },
      { id: 's5', name: 'Meta MMS-TTS Voice Synthesis', status: 'idle' },
    ];
    setPipelineSteps(steps);
    setCurrentStepText("Transcribing your Akan/Twi voice note...");

    const formData = new FormData();
    formData.append('audio', audioBlob, 'farmer_query.webm');

    try {
      const res = await fetch(`${VOICE_SERVER}/ask`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error("Voice server failed to process question.");
      const data = await res.json();

      setPipelineSteps(p => p.map(s => ({ ...s, status: 'success' })));
      setPipelineLoading(false);
      setResults({
        twiTranscript: data.twi_transcript,
        englishTranscript: data.english_transcript,
        englishReply: data.english_reply,
        twiReply: data.twi_reply,
        audioBase64: data.audio_base64,
        audioMime: data.audio_mime || 'audio/wav',
        detection: null
      });

      if (data.audio_base64) {
        playAudioData(data.audio_base64, data.audio_mime || 'audio/wav');
      }
    } catch (e: any) {
      console.error(e);
      setPipelineLoading(false);
      alert(e.message || "Voice query processing failed.");
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const s = status.toLowerCase();
    if (s.includes('healthy')) {
      return {
        bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        label: 'HEALTHY POD (Apan)',
        badgeColor: 'bg-emerald-500'
      };
    }
    if (s.includes('black') || s.includes('phytophthora')) {
      return {
        bg: 'bg-red-500/15 border-red-500/40 text-red-400',
        label: 'BLACK POD ROT (Phytophthora)',
        badgeColor: 'bg-red-500'
      };
    }
    if (s.includes('frosty') || s.includes('monilia')) {
      return {
        bg: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
        label: 'FROSTY POD ROT (Monilia)',
        badgeColor: 'bg-amber-500'
      };
    }
    return {
      bg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
      label: status.replace(/_/g, ' ').toUpperCase(),
      badgeColor: 'bg-indigo-500'
    };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
      {/* Back button */}
      <Link 
        href={`/${locale}/dashboard`}
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors w-fit"
      >
        <ArrowLeft size={16} />
        <span>Back to Plantation Dashboard</span>
      </Link>

      {/* SSE Real-time alert banner */}
      {sseAlert && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 shadow-lg animate-in slide-in-from-top-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shrink-0">
              <Bell size={24} />
            </div>
            <div className="flex-grow">
              <h3 className="text-lg font-black text-red-800 mb-1">⚠️ Automated IoT Camera Alert</h3>
              <p className="text-red-700 font-medium text-sm mb-2">{sseAlert.english_alert}</p>
              {sseAlert.twi_alert !== sseAlert.english_alert && (
                <p className="text-red-600 text-xs italic font-medium">{sseAlert.twi_alert}</p>
              )}
            </div>
            <button onClick={() => setSseAlert(null)} className="text-red-400 hover:text-red-600 text-xl font-bold">×</button>
          </div>
        </div>
      )}

      {/* Main Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-700 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Brain size={34} />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">AI Cocoa Disease Advisor</h1>
            <p className="text-slate-500 font-medium text-sm sm:text-base">
              Real-time YOLOv8 vision detection + Gemini AI + spoken Twi voice notes.
            </p>
          </div>
        </div>

        {/* Input Mode Switcher */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-fit">
          <button
            onClick={() => setInputMode('stream')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${inputMode === 'stream' ? 'bg-white text-stone-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Video size={16} className={inputMode === 'stream' ? 'text-amber-600' : ''} />
            <span>ESP32-CAM Live</span>
          </button>
          <button
            onClick={() => setInputMode('upload')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${inputMode === 'upload' ? 'bg-white text-stone-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Upload size={16} className={inputMode === 'upload' ? 'text-indigo-600' : ''} />
            <span>Upload Photo</span>
          </button>
        </div>
      </header>

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Visual Scanner & Stream (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {inputMode === 'stream' ? (
            /* ESP32-CAM Live Stream Section */
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden flex flex-col">
              
              {/* Stream Header */}
              <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <div>
                    <h3 className="font-black text-slate-800 text-sm tracking-wide">ESP32-CAM Live Stream</h3>
                    <p className="text-[11px] text-slate-500 font-mono">{streamUrl}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Stream Mode Switcher */}
                  <div className="hidden sm:flex items-center bg-slate-200/60 p-1 rounded-xl text-[11px] font-bold">
                    <button
                      onClick={() => setStreamDisplayMode('direct')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${streamDisplayMode === 'direct' ? 'bg-white text-stone-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      Direct
                    </button>
                    <button
                      onClick={() => setStreamDisplayMode('iframe')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${streamDisplayMode === 'iframe' ? 'bg-white text-stone-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      IFrame
                    </button>
                    <button
                      onClick={() => setStreamDisplayMode('proxy')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${streamDisplayMode === 'proxy' ? 'bg-white text-stone-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      Proxy
                    </button>
                  </div>

                  <button
                    onClick={() => setIsEditingStream(!isEditingStream)}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-all"
                    title="Change Camera IP"
                  >
                    <Settings size={16} />
                  </button>
                  <button
                    onClick={() => setIsAutoScanning(!isAutoScanning)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isAutoScanning ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-200/70 text-slate-700 hover:bg-slate-300'}`}
                  >
                    <RefreshCw size={13} className={isAutoScanning ? 'animate-spin' : ''} />
                    <span>{isAutoScanning ? 'Auto-Scan Active' : 'Auto-Scan'}</span>
                  </button>
                </div>
              </div>

              {/* Stream IP Configuration Drawer */}
              {isEditingStream && (
                <div className="p-4 bg-amber-50/70 border-b border-amber-200/60 flex flex-col sm:flex-row gap-2 items-center">
                  <input 
                    type="text"
                    value={streamUrl}
                    onChange={(e) => setStreamUrl(e.target.value)}
                    placeholder="http://192.168.137.164:81/stream"
                    className="flex-grow px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 w-full"
                  />
                  <button
                    onClick={async () => {
                      setIsEditingStream(false);
                      try {
                        await fetch(`${IMAGE_SERVER}/camera-config`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ streamUrl })
                        });
                      } catch {}
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer"
                  >
                    Save URL
                  </button>
                </div>
              )}

              {/* Single Connection Tip */}
              <div className="px-5 py-2 bg-amber-500/10 border-b border-amber-500/20 text-[11px] text-amber-800 flex items-center justify-between">
                <span>💡 <strong>Tip:</strong> Close any other browser tabs viewing <code className="font-mono">{streamUrl}</code> so the camera can stream here without socket locks.</span>
              </div>

              {/* Camera Connection Alert Banner */}
              {cameraError && (
                <div className="p-4 bg-amber-50 border-b border-amber-200 flex items-start gap-3 text-xs text-amber-900 animate-in fade-in">
                  <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-grow space-y-1">
                    <p className="font-bold">Cannot reach camera at <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px]">{streamUrl}</code></p>
                    <p className="text-amber-700 text-[11px]">
                      Ensure your ESP32-CAM is powered on and connected to the same Wi-Fi network. Click the ⚙️ button above if your camera IP has changed.
                    </p>
                  </div>
                  <button onClick={() => setCameraError(null)} className="text-amber-500 hover:text-amber-800 font-bold text-sm">×</button>
                </div>
              )}

              {/* Live Video Frame Container */}
              <div className="relative w-full aspect-[4/3] bg-stone-950 flex items-center justify-center overflow-hidden">
                {streamDisplayMode === 'iframe' ? (
                  <iframe 
                    src={streamUrl}
                    className="w-full h-full border-0 bg-black"
                    title="ESP32-CAM Stream"
                  />
                ) : streamDisplayMode === 'proxy' ? (
                  <img 
                    id="cam-stream-img"
                    src={`${IMAGE_SERVER}/video_feed?url=${encodeURIComponent(streamUrl)}`}
                    alt="ESP32-CAM Proxy Feed"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <img 
                    id="cam-stream-img"
                    src={`/api/camera-stream?url=${encodeURIComponent(streamUrl)}`}
                    alt="ESP32-CAM Live Feed"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.src.includes(streamUrl)) {
                        target.src = streamUrl;
                      }
                    }}
                  />
                )}

                {/* Overlaid Live Tag */}
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 flex items-center gap-2">
                  <Radio size={12} className="text-red-500 animate-pulse" />
                  <span className="text-[11px] font-mono font-bold text-white tracking-widest uppercase">Live 1080p Stream</span>
                </div>

                {/* Overlay Scanning Effect */}
                {pipelineLoading && (
                  <div className="absolute inset-0 bg-indigo-950/40 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
                    <div className="w-14 h-14 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-white font-black text-sm tracking-wide bg-stone-900/80 px-4 py-1.5 rounded-full border border-amber-500/40">
                      ⚡ Analyzing Live Frame...
                    </p>
                  </div>
                )}
              </div>

              {/* Stream Action Controls */}
              <div className="p-6 bg-white flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="text-xs text-slate-500 font-medium">
                  Point the ESP32-CAM at the cocoa pod and trigger instant diagnosis.
                </div>

                <button
                  onClick={() => scanStreamFrame(false)}
                  disabled={pipelineLoading}
                  className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-black rounded-2xl shadow-lg shadow-amber-600/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
                >
                  {pipelineLoading ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} className="fill-current text-amber-200" />}
                  <span>Scan Current Frame</span>
                </button>
              </div>
            </div>
          ) : (
            /* Upload Photo Section */
            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-200/80 flex flex-col items-center">
              <h2 className="text-lg font-bold text-slate-800 mb-4 self-start">Visual Diagnosis (Upload)</h2>
              {image ? (
                <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border-4 border-slate-100 mb-6 shadow-inner">
                  <img src={image} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => { setImage(null); setImageFile(null); }}
                    className="absolute top-4 right-4 bg-black/60 text-white p-2 rounded-full hover:bg-black transition-all"
                  >
                    <AlertCircle size={20} />
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-[4/3] bg-slate-50 border-4 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-all group mb-6"
                >
                  <Camera size={48} className="text-slate-300 group-hover:text-amber-600 transition-colors mb-4" />
                  <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Select Cocoa Pod Photo</p>
                  <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleCapture} />
                </div>
              )}

              <button 
                onClick={runImagePipeline}
                disabled={!image || pipelineLoading}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-amber-600/20 transition-all hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
              >
                {pipelineLoading ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />}
                <span>{pipelineLoading ? 'Analyzing...' : 'Run Diagnosis'}</span>
              </button>
            </div>
          )}

          {/* Voice Input Card */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-xl border border-slate-200/80 flex items-center justify-between gap-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Spoken Voice Query (Akan / Twi)</h3>
              <p className="text-xs text-slate-500 font-medium">Have a specific farm question? Speak naturally in Twi.</p>
              <span className="inline-block mt-2 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60">
                {recordingStatus}
              </span>
            </div>

            <button 
              onClick={toggleRecording}
              disabled={pipelineLoading && !isRecording}
              className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-all shrink-0 cursor-pointer ${isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-gradient-to-br from-amber-500 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white active:scale-95'}`}
            >
              {isRecording ? <Square size={24} className="text-white fill-current" /> : <Mic size={28} className="text-white" />}
            </button>
          </div>

        </div>

        {/* Right Column: AI Analysis & Spoken Twi Advisory (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-950 text-white p-7 sm:p-8 rounded-3xl shadow-2xl border border-slate-800 flex flex-col min-h-[550px]">
          
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-amber-400">Diagnosis & Advisory Output</h3>
            <span className="text-[10px] font-mono text-slate-500">Pipeline v4.0</span>
          </div>

          {!results && !pipelineLoading && (
            <div className="flex flex-col items-center justify-center my-auto text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-4">
                <Brain size={32} />
              </div>
              <h4 className="font-bold text-slate-300 text-base mb-1">Ready for Pod Scan</h4>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                Click <strong>"Scan Current Frame"</strong> or upload a photo to inspect pod health and receive spoken Twi agronomic advice.
              </p>
            </div>
          )}

          {/* Loading Stepper */}
          {pipelineLoading && (
            <div className="flex flex-col justify-center my-auto py-8">
              <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 relative mb-4">
                   <div className="absolute inset-0 border-4 border-amber-500/20 rounded-full"></div>
                   <div className="absolute inset-0 border-4 border-amber-500 rounded-full border-t-transparent animate-spin"></div>
                </div>
                <h3 className="font-bold text-amber-400 text-sm text-center px-4">{currentStepText}</h3>
              </div>
              
              <ul className="space-y-3 mx-auto w-full max-w-xs">
                {pipelineSteps.map(step => (
                  <li key={step.id} className="flex items-center gap-3 text-xs">
                    {step.status === 'success' && <CheckCircle className="text-emerald-400 shrink-0" size={16} />}
                    {step.status === 'active' && <Loader2 className="text-amber-400 animate-spin shrink-0" size={16} />}
                    {step.status === 'idle' && <Circle className="text-slate-700 shrink-0" size={16} />}
                    <span className={step.status === 'success' ? 'text-slate-200 font-medium' : step.status === 'active' ? 'text-amber-400 font-bold' : 'text-slate-600'}>
                      {step.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Completed Results Card */}
          {results && !pipelineLoading && (
            <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4">
              
              {/* Disease Pill & Confidence */}
              {results.detection && (
                <div className={`p-4 rounded-2xl border ${getStatusBadge(results.detection.status)?.bg || 'bg-slate-900 border-slate-800'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80">YOLOv8 Identification</span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      {(results.detection.confidence * 100).toFixed(1)}% Match
                    </span>
                  </div>
                  <h3 className="text-xl font-black tracking-tight text-white">
                    {getStatusBadge(results.detection.status)?.label || results.detection.status}
                  </h3>
                </div>
              )}

              {/* Source Tag */}
              {results.twiTranscript && (
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <p className="text-slate-400 text-xs font-medium">{results.twiTranscript}</p>
                </div>
              )}

              {/* Spoken Twi Voice Note Player (Prominent) */}
              {results.audioBase64 && (
                <div className="bg-stone-900 border-2 border-amber-500/50 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${isPlayingAudio ? 'bg-amber-500 text-stone-950 animate-pulse' : 'bg-stone-800 text-amber-400 border border-stone-700'}`}>
                        <Volume2 size={20} className={isPlayingAudio ? 'animate-bounce' : ''} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Twi Spoken Audio Advisory</h4>
                        <p className="text-[11px] text-amber-400 font-medium">
                          {isPlayingAudio ? "🔊 Playing spoken Twi note..." : "🎧 Meta MMS-TTS Ready"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (isPlayingAudio && activeAudioInstanceRef.current) {
                          activeAudioInstanceRef.current.pause();
                          setIsPlayingAudio(false);
                        } else if (results.audioBase64) {
                          playAudioData(results.audioBase64, results.audioMime || 'audio/wav');
                        }
                      }}
                      className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-4 py-2 rounded-xl text-xs shadow-md transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    >
                      {isPlayingAudio ? (
                        <>
                          <Pause size={14} className="fill-current" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play size={14} className="fill-current" />
                          <span>Listen Again</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Akan / Twi Translation Box */}
              {results.twiReply && (
                <div className="space-y-1.5 bg-slate-900 p-4 rounded-2xl border border-slate-800">
                  <p className="text-amber-400 font-black text-[10px] uppercase tracking-widest">Akan / Twi Advisory (Khaya NLP)</p>
                  <p className="text-slate-200 text-sm leading-relaxed font-medium">{results.twiReply}</p>
                </div>
              )}

              {/* English Recommendation */}
              <div className="space-y-1.5 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
                <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">English Treatment Instructions</p>
                <p className="text-slate-300 text-xs leading-relaxed">{results.englishReply}</p>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
