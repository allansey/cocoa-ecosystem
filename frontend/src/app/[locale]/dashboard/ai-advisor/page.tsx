'use client';
import { useState, useRef } from 'react';
import { Camera, Upload, Loader2, ArrowLeft, Brain, Volume2, ShieldCheck, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';

export default function AIAdvisor({ params: { locale } }: { params: { locale: string } }) {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeDisease = async () => {
    if (!image) return;
    setAnalyzing(true);
    try {
      // Mocking AI analysis for MVP
      await new Promise(resolve => setTimeout(resolve, 2500));
      setResult({
        disease: 'Black Pod Disease (Phytophthora)',
        confidence: 94.2,
        recommendation: 'Remove and destroy infected pods immediately. Apply copper-based fungicides to healthy pods during the rainy season.',
        twiAudio: 'https://example.com/twi_audio.mp3' // Placeholder
      });
    } catch (err) {
      console.error('AI Error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const speakRecommendation = () => {
    // In a real app, this would play the Twi audio or use a TTS engine
    alert('Playing Twi Translation: "Sε wobu n’asɛm no, ɛsɛ sɛ woyi bayerɛ a ayɛ bɔne no fi hɔ..."');
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <Link href={`/${locale}/dashboard`} className="inline-flex items-center text-amber-600 hover:text-amber-800 mb-8 font-bold bg-amber-50 px-4 py-2 rounded-full shadow-sm transition-all hover:shadow-md">
        <ArrowLeft size={18} className="mr-2" /> Back to Dashboard
      </Link>

      <div className="flex flex-col gap-10">
        <header className="flex items-center gap-6">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Brain size={36} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tighter">AI Disease Advisor</h1>
            <p className="text-slate-500 font-medium">Capture a photo of a cocoa pod to detect diseases instantly.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Camera / Upload Section */}
          <div className="bg-white p-10 rounded-3xl shadow-2xl border border-white flex flex-col items-center">
            {image ? (
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden border-4 border-slate-100 mb-6 shadow-inner">
                <img src={image} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  onClick={() => setImage(null)}
                  className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black transition-all"
                >
                  <AlertCircle size={20} />
                </button>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-square bg-slate-50 border-4 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-all group"
              >
                <Camera size={64} className="text-slate-300 group-hover:text-amber-500 transition-colors mb-4" />
                <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Tap to Capture</p>
                <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleCapture} />
              </div>
            )}

            <button 
              onClick={analyzeDisease}
              disabled={!image || analyzing}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-600/20 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {analyzing ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />}
              {analyzing ? 'Analyzing with AI...' : 'Run Diagnosis'}
            </button>
          </div>

          {/* Results Section */}
          <div className="bg-slate-900 text-white p-10 rounded-3xl shadow-2xl flex flex-col min-h-[400px]">
            {!result && !analyzing && (
              <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
                <Brain size={64} className="mb-4" />
                <p className="font-bold">Waiting for input...</p>
                <p className="text-xs mt-2">Analysis results will appear here.</p>
              </div>
            )}

            {analyzing && (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="w-20 h-20 relative">
                   <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
                   <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                </div>
                <p className="mt-6 font-black uppercase tracking-[0.2em] text-xs text-indigo-400">Processing Pixels</p>
              </div>
            )}

            {result && (
              <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                  <p className="text-indigo-400 font-black text-[10px] uppercase tracking-widest mb-1">Detected Disease</p>
                  <h3 className="text-2xl font-black text-white">{result.disease}</h3>
                  <p className="text-xs font-bold text-emerald-400 mt-1">{result.confidence}% Confidence</p>
                </div>

                <div className="space-y-2">
                  <p className="text-indigo-400 font-black text-[10px] uppercase tracking-widest">AI Recommendation</p>
                  <p className="text-slate-300 font-medium leading-relaxed">{result.recommendation}</p>
                </div>

                <button 
                  onClick={speakRecommendation}
                  className="mt-4 bg-white/20 hover:bg-white/30 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-3 border border-white/10 shadow-lg"
                >
                  <Volume2 size={20} className="text-indigo-300" />
                  Listen in Twi
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
