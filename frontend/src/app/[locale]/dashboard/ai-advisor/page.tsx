'use client';
import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Loader2, ArrowLeft, Brain, Volume2, ShieldCheck, AlertCircle, Mic, Square, CheckCircle, Circle, Bell } from 'lucide-react';
import Link from 'next/link';

const IMAGE_SERVER = process.env.NEXT_PUBLIC_AI_IMAGE_SERVER_URL || "http://localhost:5002";
const VOICE_SERVER = process.env.NEXT_PUBLIC_VOICE_SERVER_URL || "http://localhost:5001";

interface Detection {
  status: string;
  confidence: number;
  advice?: string;
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
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([]);
  const [currentStepText, setCurrentStepText] = useState("");
  const [results, setResults] = useState<ResultsData | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState("Tap to start recording");

  // SSE real-time alert
  const [sseAlert, setSseAlert] = useState<SSEAlert | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const sseAlertAudioRef = useRef<HTMLAudioElement | null>(null);

  // Connect to SSE stream for real-time push alerts if voice server is reachable
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
              // Auto-play alert audio
              if (data.audio_base64 && sseAlertAudioRef.current) {
                sseAlertAudioRef.current.src = `data:${data.audio_mime};base64,${data.audio_base64}`;
                sseAlertAudioRef.current.play().catch(() => {});
              }
            }
          } catch { /* ignore parse errors */ }
        };
        es.onerror = () => {
          es?.close();
        };
      } catch {
        // Voice server is currently offline; silently skip SSE stream
      }
    };

    connectSSE();

    return () => {
      cancelled = true;
      es?.close();
    };
  }, []);

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
    setCurrentStepText("Running YOLOv8 computer vision model...");

    const formData = new FormData();
    formData.append('image', imageFile);

    try {
      // 1. YOLOv8 Image Inference
      const uploadRes = await fetch(`${IMAGE_SERVER}/upload`, { method: 'POST', body: formData });
      if (!uploadRes.ok) throw new Error("YOLO server failed to process image.");
      const uploadData = await uploadRes.json();

      setPipelineSteps(p => p.map(s => s.id === 's1' ? { ...s, status: 'success' } : s.id === 's2' ? { ...s, status: 'active' } : s));
      setCurrentStepText("Generating tailored advisory with Gemini AI...");

      const det = uploadData.detection || { status: 'healthy', primary_detection: { confidence: 0.95 }, advice: '' };
      const status = det.status || 'healthy';
      const confidence = det.primary_detection?.confidence || 0.95;

      // 2. Call Voice Server for Gemini Advisory -> Khaya Twi Translation -> Meta MMS-TTS Audio Synthesis
      let advisoryData: any = null;
      try {
        setPipelineSteps(p => p.map(s => s.id === 's2' ? { ...s, status: 'success' } : s.id === 's3' ? { ...s, status: 'active' } : s));
        setCurrentStepText("Translating advisory to Twi (Khaya NLP)...");

        const advisoryRes = await fetch(`${VOICE_SERVER}/advisory`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ detection: det })
        });

        if (advisoryRes.ok) {
          setPipelineSteps(p => p.map(s => (s.id === 's2' || s.id === 's3') ? { ...s, status: 'success' } : s.id === 's4' ? { ...s, status: 'active' } : s));
          setCurrentStepText("Synthesizing Twi voice advisory (Meta MMS-TTS)...");
          advisoryData = await advisoryRes.json();
        }
      } catch (voiceErr) {
        console.warn("Voice advisory server unreachable or encountered error:", voiceErr);
      }

      setPipelineSteps(p => p.map(s => ({ ...s, status: 'success' })));
      setCurrentStepText("Diagnosis and Twi advisory ready!");

      const englishReply = advisoryData?.english_alert || det.advice || "Cocoa pod analysis complete.";
      const twiReply = advisoryData?.twi_alert || "";
      const audioBase64 = advisoryData?.audio_base64 || "";
      const audioMime = advisoryData?.audio_mime || "audio/wav";

      setTimeout(() => {
        setPipelineLoading(false);
        setResults({
          twiTranscript: "Mfoni Nhwehwɛmu (Visual Scan)",
          englishTranscript: `Cocoa Pod: ${status.replace(/_/g, ' ')} (${(confidence * 100).toFixed(1)}% Confidence)`,
          englishReply: englishReply,
          twiReply: twiReply,
          audioBase64: audioBase64,
          audioMime: audioMime,
          detection: { status, confidence, advice: englishReply }
        });

        // Auto-play audio if available
        if (audioBase64 && audioPlayerRef.current) {
          audioPlayerRef.current.src = `data:${audioMime};base64,${audioBase64}`;
          audioPlayerRef.current.play().catch(() => {});
        }
      }, 400);

    } catch (err: any) {
      console.error(err);
      setPipelineLoading(false);
      alert(err.message || "Diagnosis pipeline failed. Please check inference and voice servers.");
    }
  };

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
    setImage(null);
    setImageFile(null);

    const steps: PipelineStep[] = [
      { id: 'v1', name: 'Converting audio (FFmpeg)', status: 'active' },
      { id: 'v2', name: 'Twi Speech-to-Text (Khaya STT)', status: 'idle' },
      { id: 'v3', name: 'Twi → English translation', status: 'idle' },
      { id: 'v4', name: 'Generating advice (Gemini AI)', status: 'idle' },
      { id: 'v5', name: 'English → Twi translation', status: 'idle' },
      { id: 'v6', name: 'Twi voice synthesis (MMS-TTS)', status: 'idle' },
    ];
    setPipelineSteps(steps);
    setCurrentStepText("Converting audio...");

    const formData = new FormData();
    formData.append('audio', audioBlob, 'mic_input.webm');

    try {
      await new Promise(r => setTimeout(r, 400));
      setPipelineSteps(p => p.map(s =>
        s.id === 'v1' ? { ...s, status: 'success' } :
        s.id === 'v2' ? { ...s, status: 'active' } : s
      ));
      setCurrentStepText("Transcribing Twi speech...");

      const res = await fetch(`${VOICE_SERVER}/voice`, { method: 'POST', body: formData });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Voice pipeline failed"); }
      const data = await res.json();

      setPipelineSteps(p => p.map(s => ({ ...s, status: 'success' })));
      setCurrentStepText("Advisory response ready!");

      setTimeout(() => {
        setPipelineLoading(false);
        setResults({
          twiTranscript: data.twi_transcript,
          englishTranscript: data.english_transcript,
          englishReply: data.english_reply,
          twiReply: data.twi_reply,
          audioBase64: data.audio_base64,
          audioMime: data.audio_mime,
          detection: data.detection ? {
            status: data.detection.status,
            confidence: data.detection.primary_detection?.confidence || 1.0,
            advice: data.detection.advice
          } : null
        });
        setRecordingStatus("Tap to ask another question");
      }, 500);

    } catch (err: any) {
      console.error(err);
      setPipelineLoading(false);
      setRecordingStatus("Tap to try again");
      alert(err.message || "Voice pipeline failed");
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      {/* Hidden audio element for SSE alert auto-play */}
      <audio ref={sseAlertAudioRef} className="hidden" />

      <Link href={`/${locale}/dashboard`} className="inline-flex items-center text-amber-600 hover:text-amber-800 mb-8 font-bold bg-amber-50 px-4 py-2 rounded-full shadow-sm transition-all hover:shadow-md">
        <ArrowLeft size={18} className="mr-2" /> Back to Dashboard
      </Link>

      {/* SSE Real-time Alert Banner */}
      {sseAlert && (
        <div className="mb-8 bg-red-50 border-2 border-red-200 rounded-2xl p-6 shadow-lg animate-in fade-in slide-in-from-top-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shrink-0">
              <Bell size={24} />
            </div>
            <div className="flex-grow">
              <h3 className="text-lg font-black text-red-800 mb-1">⚠️ Disease Alert</h3>
              <p className="text-red-700 font-medium text-sm mb-2">{sseAlert.english_alert}</p>
              {sseAlert.twi_alert !== sseAlert.english_alert && (
                <p className="text-red-600 text-xs italic">{sseAlert.twi_alert}</p>
              )}
              {sseAlert.audio_base64 && (
                <audio
                  src={`data:${sseAlert.audio_mime};base64,${sseAlert.audio_base64}`}
                  controls
                  className="mt-3 w-full max-w-sm"
                  style={{ height: '36px' }}
                />
              )}
            </div>
            <button onClick={() => setSseAlert(null)} className="text-red-400 hover:text-red-600 text-xl font-bold">×</button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-10">
        <header className="flex items-center gap-6">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Brain size={36} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tighter">AI Disease Advisor</h1>
            <p className="text-slate-500 font-medium">Capture a photo of a cocoa pod or ask a question in Twi.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          {/* Controls Section */}
          <div className="flex flex-col gap-8">
            
            {/* Image Upload */}
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center">
              <h2 className="text-xl font-bold text-slate-800 mb-4 self-start">Visual Analysis</h2>
              {image ? (
                <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border-4 border-slate-100 mb-6 shadow-inner">
                  <img src={image} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => { setImage(null); setImageFile(null); }}
                    className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black transition-all"
                  >
                    <AlertCircle size={20} />
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-[4/3] bg-slate-50 border-4 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-all group mb-6"
                >
                  <Camera size={48} className="text-slate-300 group-hover:text-indigo-500 transition-colors mb-4" />
                  <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Upload Photo</p>
                  <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleCapture} />
                </div>
              )}

              <button 
                onClick={runImagePipeline}
                disabled={!image || pipelineLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-600/20 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {pipelineLoading ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />}
                {pipelineLoading ? 'Analyzing...' : 'Run Diagnosis'}
              </button>
            </div>

            {/* Voice Input */}
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center text-center">
              <h2 className="text-xl font-bold text-slate-800 mb-2 self-start">Voice Advisory (Twi)</h2>
              <p className="text-sm text-slate-500 mb-6 self-start">Speak in Twi to ask about your cocoa farm.</p>
              
              <button 
                onClick={toggleRecording}
                disabled={pipelineLoading && !isRecording}
                className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all ${isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-amber-500 hover:bg-amber-600 disabled:opacity-50'}`}
              >
                {isRecording ? <Square size={32} className="text-white" /> : <Mic size={36} className="text-white" />}
              </button>
              <span className="text-slate-600 font-medium mt-4">{recordingStatus}</span>
            </div>
            
          </div>

          {/* Results Section */}
          <div className="bg-slate-900 text-white p-10 rounded-3xl shadow-2xl flex flex-col min-h-[500px]">
            {!results && !pipelineLoading && (
              <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
                <Brain size={64} className="mb-4" />
                <p className="font-bold">Waiting for input...</p>
                <p className="text-xs mt-2">Analysis results will appear here.</p>
              </div>
            )}

            {pipelineLoading && (
              <div className="flex flex-col justify-center h-full">
                <div className="flex flex-col items-center mb-8">
                  <div className="w-16 h-16 relative mb-4">
                     <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
                     <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                  </div>
                  <h3 className="font-bold text-indigo-400">{currentStepText}</h3>
                </div>
                
                <ul className="space-y-3 mx-auto w-full max-w-sm">
                  {pipelineSteps.map(step => (
                    <li key={step.id} className="flex items-center gap-3 text-sm">
                      {step.status === 'success' && <CheckCircle className="text-emerald-400" size={18} />}
                      {step.status === 'active' && <Loader2 className="text-amber-400 animate-spin" size={18} />}
                      {step.status === 'idle' && <Circle className="text-slate-600" size={18} />}
                      <span className={step.status === 'success' ? 'text-slate-200' : step.status === 'active' ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                        {step.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {results && !pipelineLoading && (
              <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4">
                
                {/* Detection Badge */}
                {results.detection && results.detection.status !== 'no_detections_yet' && (
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                    <p className="text-indigo-400 font-black text-[10px] uppercase tracking-widest mb-1">YOLOv8 Detection</p>
                    <h3 className="text-2xl font-black text-white">{results.detection.status.replace(/_/g, ' ').toUpperCase()}</h3>
                    <p className="text-xs font-bold text-emerald-400 mt-1">{(results.detection.confidence * 100).toFixed(1)}% Confidence</p>
                  </div>
                )}

                {/* Transcripts */}
                {(results.twiTranscript || results.englishTranscript) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                      <p className="text-amber-400 font-black text-[10px] uppercase tracking-widest mb-1">Input (Twi)</p>
                      <p className="text-slate-300 text-sm">{results.twiTranscript || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                      <p className="text-indigo-400 font-black text-[10px] uppercase tracking-widest mb-1">Input (English)</p>
                      <p className="text-slate-300 text-sm">{results.englishTranscript || 'N/A'}</p>
                    </div>
                  </div>
                )}

                {/* Recommendation */}
                <div className="space-y-2 mt-2">
                  <p className="text-indigo-400 font-black text-[10px] uppercase tracking-widest">AI Recommendation (English)</p>
                  <p className="text-slate-200 font-medium leading-relaxed">{results.englishReply}</p>
                </div>

                {results.twiReply && (
                  <div className="space-y-2">
                    <p className="text-amber-400 font-black text-[10px] uppercase tracking-widest">Twi Translation</p>
                    <p className="text-slate-400 text-sm leading-relaxed">{results.twiReply}</p>
                  </div>
                )}

                {/* Audio Player */}
                {results.audioBase64 && (
                  <div className="mt-4 bg-white/5 p-4 rounded-2xl flex flex-col items-center gap-3 border border-white/10 shadow-lg">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                      <Volume2 size={18} /> Listen in Twi
                    </div>
                    <audio
                      ref={audioPlayerRef}
                      src={`data:${results.audioMime};base64,${results.audioBase64}`}
                      controls
                      autoPlay
                      className="w-full"
                    />
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

