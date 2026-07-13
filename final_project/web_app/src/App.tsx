import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const IMAGE_SERVER = "http://localhost:5000";
const VOICE_SERVER = "http://localhost:5001";

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

export default function App() {
  // State
  const [activeTab, setActiveTab] = useState<'upload' | 'camera'>('upload');
  const [activeDetection, setActiveDetection] = useState<Detection | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState("Tap to start recording");

  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([]);
  const [currentStepText, setCurrentStepText] = useState("Initializing Pipeline...");
  const [results, setResults] = useState<ResultsData | null>(null);
  const [fileName, setFileName] = useState("No file chosen");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'neutral' } | null>(null);

  // Server connection status
  const [imageServerOnline, setImageServerOnline] = useState(false);
  const [voiceServerOnline, setVoiceServerOnline] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // On load: check server status
  useEffect(() => {
    checkServers();
    updateActiveDetectionStatus();
  }, []);

  // Webcam lifecycle
  useEffect(() => {
    if (activeTab === 'camera') {
      startWebcam();
    } else {
      stopWebcam();
    }
    return () => stopWebcam();
  }, [activeTab]);

  const checkServers = async () => {
    try {
      const r1 = await fetch(`${IMAGE_SERVER}/`, { signal: AbortSignal.timeout(3000) });
      setImageServerOnline(r1.ok);
    } catch { setImageServerOnline(false); }

    try {
      const r2 = await fetch(`${VOICE_SERVER}/`, { signal: AbortSignal.timeout(3000) });
      setVoiceServerOnline(r2.ok);
    } catch { setVoiceServerOnline(false); }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'neutral') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const updateActiveDetectionStatus = async () => {
    try {
      const res = await fetch(`${IMAGE_SERVER}/last`);
      const data = await res.json();
      if (data.status && data.status !== 'no_detections_yet') {
        setActiveDetection({ status: data.status, confidence: data.primary_detection?.confidence || 1.0, advice: data.advice });
      } else {
        setActiveDetection(null);
      }
    } catch { /* offline */ }
  };

  // ====== Webcam ======
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Camera error:", err);
      showToast("Could not access camera. Check permissions.", "error");
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const captureWebcam = () => {
    if (!videoRef.current || !streamRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    setPreviewUrl(canvas.toDataURL('image/jpeg'));
    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
        runImagePipeline(file);
      }
    }, "image/jpeg");
  };

  // ====== File Upload ======
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setPreviewUrl(URL.createObjectURL(file));
    runImagePipeline(file);
  };

  // ====== Main Image Pipeline: Upload -> YOLO -> Gemini -> Khaya -> TTS ======
  const runImagePipeline = async (file: File) => {
    setPipelineLoading(true);
    setResults(null);

    const steps: PipelineStep[] = [
      { id: 's1', name: 'Uploading image to YOLOv8 model', status: 'active' },
      { id: 's2', name: 'Running cocoa disease detection', status: 'idle' },
      { id: 's3', name: 'Generating advice with Gemini AI', status: 'idle' },
      { id: 's4', name: 'Translating advice to Twi (Khaya)', status: 'idle' },
      { id: 's5', name: 'Synthesizing Twi voice (Khaya TTS)', status: 'idle' },
    ];
    setPipelineSteps(steps);
    setCurrentStepText("Uploading image to YOLO server...");

    const formData = new FormData();
    formData.append('image', file);

    try {
      // Step 1-2: YOLO inference
      const uploadRes = await fetch(`${IMAGE_SERVER}/upload`, { method: 'POST', body: formData });
      if (!uploadRes.ok) throw new Error("YOLO server failed to process image.");
      const uploadData = await uploadRes.json();

      setPipelineSteps(p => p.map(s =>
        s.id === 's1' ? { ...s, status: 'success' } :
        s.id === 's2' ? { ...s, status: 'success' } :
        s.id === 's3' ? { ...s, status: 'active' } : s
      ));
      setCurrentStepText("Generating AI advisory with Gemini...");

      const det = uploadData.detection;
      const status = det.status;
      const confidence = det.primary_detection?.confidence || 1.0;
      updateActiveDetectionStatus();

      // Step 3-5: Gemini + Khaya Translation + TTS
      const explainRes = await fetch(`${VOICE_SERVER}/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, confidence })
      });
      if (!explainRes.ok) throw new Error("Voice server failed to generate advice.");
      const explainData = await explainRes.json();

      setPipelineSteps(p => p.map(s => ({ ...s, status: 'success' })));
      setCurrentStepText("Pipeline complete!");

      setTimeout(() => {
        setPipelineLoading(false);
        setResults({
          twiTranscript: "Mfoni nhwehwɛmu (Image Analysis)",
          englishTranscript: `Image classified as: ${status.replace(/_/g, ' ')}`,
          englishReply: explainData.english_reply,
          twiReply: explainData.twi_reply,
          audioBase64: explainData.audio_base64,
          audioMime: explainData.audio_mime,
          detection: { status, confidence, advice: det.advice }
        });
        showToast(`Detection: ${status.replace(/_/g, ' ').toUpperCase()}`, 'success');
      }, 500);

    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Pipeline failed", "error");
      setPipelineLoading(false);
    }
  };

  // ====== Voice Recording ======
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
      showToast("Microphone access denied.", "error");
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
    setPreviewUrl(null);

    const steps: PipelineStep[] = [
      { id: 'v1', name: 'Converting audio (FFmpeg)', status: 'active' },
      { id: 'v2', name: 'Twi Speech-to-Text (Khaya STT)', status: 'idle' },
      { id: 'v3', name: 'Twi → English translation', status: 'idle' },
      { id: 'v4', name: 'Generating advice (Gemini AI)', status: 'idle' },
      { id: 'v5', name: 'English → Twi translation', status: 'idle' },
      { id: 'v6', name: 'Twi voice synthesis (Khaya TTS)', status: 'idle' },
    ];
    setPipelineSteps(steps);
    setCurrentStepText("Converting audio to WAV...");

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
        updateActiveDetectionStatus();
        setRecordingStatus("Tap to ask another question");
      }, 500);

    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Voice pipeline failed", "error");
      setPipelineLoading(false);
      setRecordingStatus("Tap to try again");
    }
  };

  const resetLog = async () => {
    setResults(null);
    setPreviewUrl(null);
    setRecordingStatus("Tap to start recording");
    try {
      await fetch(`${IMAGE_SERVER}/reset`, { method: 'POST' });
      setActiveDetection(null);
    } catch { /* ignore */ }
  };

  const statusColor = (s: string) => s === 'healthy' ? 'bg-success' : 'bg-danger';
  const statusLabel = (s: string) => s.replace(/_/g, ' ').toUpperCase();

  return (
    <div className="app-root min-vh-100 py-4 px-2 px-md-4 position-relative">
      <div className="glass-bg"></div>

      {notification && (
        <div className={`toast-alert toast-${notification.type}`}>{notification.message}</div>
      )}

      {/* Header */}
      <header className="text-center mb-4">
        <div className="d-flex justify-content-center align-items-center gap-2 mb-1">
          <span className="fs-2">🌿</span>
          <h1 className="m-0 fw-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Smart Cocoa <span className="text-warning">Advisor</span>
          </h1>
        </div>
        <p className="text-light opacity-75 small mb-2">
          AI-powered cocoa disease detection & voice advisory for Ghanaian farmers
        </p>
        {/* Server Status */}
        <div className="d-flex justify-content-center gap-3">
          <span className="badge bg-dark bg-opacity-50 d-flex align-items-center gap-1 px-2 py-1">
            <span className={`status-dot ${imageServerOnline ? 'online' : 'offline'}`}></span>
            YOLO :5000
          </span>
          <span className="badge bg-dark bg-opacity-50 d-flex align-items-center gap-1 px-2 py-1">
            <span className={`status-dot ${voiceServerOnline ? 'online' : 'offline'}`}></span>
            Voice :5001
          </span>
          <button className="badge bg-dark bg-opacity-50 border-0 text-light" style={{cursor:'pointer'}} onClick={checkServers}>
            <i className="bi bi-arrow-clockwise"></i> Refresh
          </button>
        </div>
      </header>

      <main className="container-fluid" style={{ maxWidth: '1200px' }}>
        <div className="row g-4">

          {/* ===== LEFT COLUMN ===== */}
          <section className="col-12 col-lg-5 d-flex flex-column gap-4">

            {/* Card 1: Image Analysis */}
            <div className="card glass-card border-glow">
              <div className="card-header bg-transparent border-0 d-flex align-items-center gap-2 pt-3 pb-0">
                <span className="step-num bg-warning text-dark fw-bold rounded-circle d-flex align-items-center justify-content-center">1</span>
                <h2 className="h5 text-white fw-semibold m-0">Cocoa Pod Analysis</h2>
              </div>
              <div className="card-body">
                <p className="text-light opacity-75 small mb-3">
                  Upload a photo of your cocoa pod or use the camera. The YOLOv8 model will detect disease.
                </p>

                {/* Tabs */}
                <div className="d-flex mb-3 rounded p-1 bg-dark bg-opacity-50">
                  <button className={`btn btn-sm flex-fill text-white border-0 ${activeTab === 'upload' ? 'active-tab' : 'opacity-75'}`}
                    onClick={() => setActiveTab('upload')}>
                    <i className="bi bi-cloud-arrow-up me-1"></i> Upload
                  </button>
                  <button className={`btn btn-sm flex-fill text-white border-0 ${activeTab === 'camera' ? 'active-tab' : 'opacity-75'}`}
                    onClick={() => setActiveTab('camera')}>
                    <i className="bi bi-camera me-1"></i> Camera
                  </button>
                </div>

                {/* Upload Tab */}
                {activeTab === 'upload' && (
                  <div className="upload-dropzone p-4 rounded text-center"
                       onClick={() => document.getElementById('file-input')?.click()}>
                    <i className="bi bi-image fs-1 text-warning d-block mb-2"></i>
                    <p className="text-white mb-1 fw-semibold">Click to select a cocoa pod image</p>
                    <span className="text-muted small">{fileName}</span>
                    <input type="file" id="file-input" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
                  </div>
                )}

                {/* Camera Tab */}
                {activeTab === 'camera' && (
                  <div className="text-center">
                    <div className="ratio ratio-4x3 mb-2 rounded overflow-hidden bg-black">
                      <video ref={videoRef} autoPlay playsInline muted className="w-100 h-100" style={{ objectFit: 'cover' }}></video>
                    </div>
                    <button className="btn btn-warning w-100 fw-semibold" onClick={captureWebcam}>
                      <i className="bi bi-camera-fill me-1"></i> Capture & Analyze
                    </button>
                  </div>
                )}

                {/* Image Preview */}
                {previewUrl && (
                  <div className="mt-3 text-center">
                    <img src={previewUrl} alt="Preview" className="rounded" style={{ maxHeight: '160px', maxWidth: '100%', objectFit: 'cover', border: '2px solid rgba(255,193,7,0.3)' }} />
                  </div>
                )}

                <hr className="border-secondary opacity-25 my-3" />

                {/* Active Detection Badge */}
                <div className="d-flex justify-content-between align-items-center p-2 rounded bg-black bg-opacity-25">
                  <span className="text-white small">Last Detection:</span>
                  <span className={`badge px-2 py-1 ${activeDetection ? statusColor(activeDetection.status) : 'bg-secondary'}`}>
                    {activeDetection ? statusLabel(activeDetection.status) : "NONE"}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Voice Terminal */}
            <div className="card glass-card border-glow">
              <div className="card-header bg-transparent border-0 d-flex align-items-center gap-2 pt-3 pb-0">
                <span className="step-num bg-warning text-dark fw-bold rounded-circle d-flex align-items-center justify-content-center">2</span>
                <h2 className="h5 text-white fw-semibold m-0">Voice Advisory</h2>
              </div>
              <div className="card-body text-center">
                <p className="text-light opacity-75 small text-start mb-3">
                  Speak in Twi to ask about your cocoa pod. The AI will respond with audio advice.
                </p>

                <div className="py-3 d-flex flex-column align-items-center">
                  <button
                    className={`mic-button btn rounded-circle d-flex align-items-center justify-content-center position-relative ${isRecording ? 'recording bg-danger' : 'bg-warning'}`}
                    onClick={toggleRecording}
                    style={{ width: '80px', height: '80px' }}
                  >
                    <i className={`bi fs-3 ${isRecording ? 'bi-stop-fill text-white' : 'bi-mic-fill text-dark'}`}></i>
                    {isRecording && <><div className="pulse-ring"></div><div className="pulse-ring-outer"></div></>}
                  </button>
                  <span className="text-white small mt-3 fw-semibold">{recordingStatus}</span>

                  <div className={`waveform mt-3 d-flex gap-1 justify-content-center ${isRecording ? 'active' : ''}`}>
                    {[...Array(8)].map((_, i) => <span key={i} className="bar"></span>)}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ===== RIGHT COLUMN ===== */}
          <section className="col-12 col-lg-7">
            <div className="card glass-card h-100">
              <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center pt-3 pb-0">
                <h2 className="h5 text-white fw-semibold m-0">Pipeline & Results</h2>
                <button className="btn btn-sm btn-outline-light border-0 opacity-75" onClick={resetLog}>Clear</button>
              </div>

              <div className="card-body d-flex flex-column justify-content-center p-3 p-md-4">

                {/* Loading */}
                {pipelineLoading && (
                  <div className="py-5 text-center">
                    <div className="spinner-border text-warning mb-4" role="status" style={{ width: '3rem', height: '3rem' }}></div>
                    <h3 className="h5 text-warning fw-semibold mb-3">{currentStepText}</h3>
                    <ul className="progress-steps list-unstyled d-flex flex-column align-items-start mx-auto gap-2 text-start" style={{ maxWidth: '360px' }}>
                      {pipelineSteps.map(step => (
                        <li key={step.id} className={`step d-flex align-items-center gap-2 small ${step.status}`}>
                          {step.status === 'success' && <i className="bi bi-check-circle-fill text-success"></i>}
                          {step.status === 'active' && <span className="spinner-border spinner-border-sm text-warning"></span>}
                          {step.status === 'idle' && <i className="bi bi-circle text-muted"></i>}
                          <span className={step.status === 'success' ? 'text-white' : step.status === 'active' ? 'text-warning fw-semibold' : 'text-muted'}>
                            {step.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Empty */}
                {!pipelineLoading && !results && (
                  <div className="py-5 text-center">
                    <i className="bi bi-upload fs-1 text-warning opacity-50 d-block mb-3"></i>
                    <h3 className="h5 text-white fw-semibold mb-2">Ready for Analysis</h3>
                    <p className="text-light opacity-75 small mx-auto" style={{ maxWidth: '400px' }}>
                      Upload a cocoa pod image or use the microphone to start the advisory pipeline.
                    </p>
                  </div>
                )}

                {/* Results */}
                {!pipelineLoading && results && (
                  <div className="d-flex flex-column gap-3 text-start">

                    {/* Detection Card */}
                    {results.detection && results.detection.status !== 'no_detections_yet' && (
                      <div className="p-3 rounded border border-secondary border-opacity-25 bg-dark bg-opacity-25">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="text-white small fw-bold">
                            <i className="bi bi-eye-fill me-1 text-warning"></i> YOLOv8 Detection
                          </span>
                          <span className={`badge ${statusColor(results.detection.status)}`}>
                            {statusLabel(results.detection.status)} ({(results.detection.confidence * 100).toFixed(0)}%)
                          </span>
                        </div>
                        <p className="text-light opacity-75 small mb-0">{results.detection.advice}</p>
                      </div>
                    )}

                    {/* Transcripts */}
                    <div className="d-flex flex-column gap-2">
                      <div className="bubble p-3 rounded bg-dark bg-opacity-25 border border-secondary border-opacity-10">
                        <span className="text-warning small fw-bold d-block mb-1">
                          <i className="bi bi-chat-left-text me-1"></i> Input (Twi)
                        </span>
                        <p className="text-white small m-0">{results.twiTranscript || 'N/A'}</p>
                      </div>
                      <div className="bubble p-3 rounded bg-dark bg-opacity-25 border border-secondary border-opacity-10">
                        <span className="text-warning small fw-bold d-block mb-1">
                          <i className="bi bi-translate me-1"></i> Input (English)
                        </span>
                        <p className="text-white small m-0">{results.englishTranscript || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Advisor Response */}
                    <div className="p-3 p-md-4 rounded border border-warning border-opacity-15 advisor-reply">
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <span className="fs-4">🌿</span>
                        <h3 className="h6 text-white fw-bold m-0">AI Advisor Response</h3>
                      </div>

                      <div className="mb-3 p-2 rounded bg-black bg-opacity-25 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
                        <span className="text-warning small fw-semibold">
                          <i className="bi bi-volume-up-fill me-1"></i> Twi Voice:
                        </span>
                        <audio
                          ref={audioPlayerRef}
                          src={results.audioBase64 ? `data:${results.audioMime};base64,${results.audioBase64}` : undefined}
                          controls autoPlay className="w-100" style={{ maxWidth: '300px', height: '36px' }}
                        />
                      </div>

                      <div className="d-flex flex-column gap-3">
                        <div>
                          <span className="text-warning small d-block mb-1">English Advice:</span>
                          <p className="text-white small m-0 lh-base">{results.englishReply}</p>
                        </div>
                        <div className="border-top border-secondary border-opacity-10 pt-3">
                          <span className="text-warning small d-block mb-1">Twi Translation:</span>
                          <p className="text-white small m-0 lh-base">{results.twiReply}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="text-center mt-5 py-3 border-top border-secondary border-opacity-10">
        <p className="text-light opacity-50 small mb-0">
          Built with YOLOv8 · GhanaNLP (Khaya) · Google Gemini 2.5 · Designed by Antigravity AI
        </p>
      </footer>
    </div>
  );
}
