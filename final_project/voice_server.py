"""
Voice + AI Server - Cocoa Advisory (with real-time push)
==========================================================
Runs on your laptop on port 5001.

Two responsibilities:

1. PUSH PIPELINE (new): receives detection events from the image server via
   POST /notify, generates a Twi alert message, synthesises it with MMS-TTS,
   and broadcasts the alert + audio to all browsers connected to GET /stream.
   Only diseased detections are broadcast; healthy / no-pod ones are silently
   cached for use by voice queries.

2. VOICE Q&A: receives audio from the browser via POST /voice, runs the full
   Twi pipeline (STT -> translate -> Gemini -> translate -> MMS-TTS), and
   returns the synthesised reply.

Setup:
    pip install -r requirements.txt
    # plus ffmpeg installed on the system

API keys: put them in a .env file in the same folder as this script.

Run:
    python voice_server.py
"""

import os
import io
import sys
import json
import base64
import queue
import threading
import tempfile
from datetime import datetime

# Ensure Windows terminal doesn't crash on Twi characters (ɔ, ɛ)
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

import requests
import torch
import numpy as np
import scipy.io.wavfile
from dotenv import load_dotenv
from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from pydub import AudioSegment

from ghana_nlp import GhanaNLP
from google import genai
from transformers import VitsModel, VitsTokenizer

# Load keys from .env file in the same folder
load_dotenv()

# ===== Configuration =====
GHANA_NLP_API_KEY = os.environ.get("GHANA_NLP_API_KEY", "PUT_YOUR_KHAYA_KEY_HERE")
GEMINI_API_KEY    = os.environ.get("GEMINI_API_KEY",    "PUT_YOUR_GEMINI_KEY_HERE")

IMAGE_SERVER_URL  = "http://localhost:5002"
LANGUAGE_CODE     = "tw"                       # Twi
GEMINI_MODEL      = "gemini-2.5-flash-lite"    # best free-tier model

# Keywords (in English, after translation) that suggest the farmer
# is asking about a specific pod. When matched, we attach the latest
# detection from the image server to the LLM prompt.
POD_KEYWORDS = [
    "pod", "cocoa", "disease", "sick", "ill", "infect", "rot", "black",
    "brown", "wrong", "healthy", "fungus", "borer", "spot", "discol",
]

SYSTEM_PROMPT = (
    "You are an AI cocoa farming advisor for smallholder farmers in Ghana. "
    "You speak warmly and respectfully. Keep responses short and practical - "
    "two to three sentences maximum. Avoid jargon. If specific disease "
    "information is provided in the prompt, use it to give targeted advice. "
    "If you don't know something specific, suggest the farmer contact their "
    "local cocoa extension officer. Reply in plain English; translation to "
    "Twi happens automatically afterward."
)

# ===== Initialize clients =====
print("Initializing Khaya (Ghana NLP) client...")
nlp = GhanaNLP(GHANA_NLP_API_KEY)

print(f"Initializing Gemini client ({GEMINI_MODEL})...")
gemini_client = genai.Client(api_key=GEMINI_API_KEY)

print("Loading MMS-TTS Akan model from Hugging Face...")
print("  (first run will download ~150MB; subsequent runs use the cache)")
tts_model = VitsModel.from_pretrained("facebook/mms-tts-aka")
tts_tokenizer = VitsTokenizer.from_pretrained("facebook/mms-tts-aka")
tts_model.eval()
# Tweak these if speech is too fast/slow or too monotone
tts_model.speaking_rate = 0.75   # slightly slower for more natural pacing
tts_model.noise_scale = 1    # higher noise_scale increases expressive variation (less monotone)
print(f"  MMS-TTS ready (sample rate: {tts_model.config.sampling_rate} Hz)")

app = Flask(__name__)
CORS(app, expose_headers=["Content-Type"])


# ===== TTS via Meta's MMS-TTS Akan =====
def synthesize_twi_audio(text: str) -> bytes:
    """
    Synthesize Twi/Akan text to WAV audio bytes using Meta's MMS-TTS.
    Replaces Khaya TTS - runs locally, no API key, no rate limit.
    """
    inputs = tts_tokenizer(text, return_tensors="pt")
    with torch.no_grad():
        output = tts_model(**inputs).waveform

    waveform = output.squeeze().cpu().numpy()
    waveform_int16 = (waveform * 32767).astype(np.int16)

    buf = io.BytesIO()
    scipy.io.wavfile.write(buf, tts_model.config.sampling_rate, waveform_int16)
    return buf.getvalue()


# ===== Real-time push infrastructure =====
# Diseased classes that trigger browser alerts. Healthy / no_pod_detected are
# silently cached but NOT pushed to the browser.
DISEASE_STATUSES = {"black_pod_rot", "frosty_pod_rot"}

# Friendly disease / condition names
DISEASE_DISPLAY_NAMES = {
    "healthy":         "Healthy Cocoa Pod",
    "black_pod_rot":   "Black Pod Rot (Phytophthora)",
    "frosty_pod_rot":  "Frosty Pod Rot (Moniliophthora)",
}

# Latest detection received via /notify (used by /voice queries).
_cached_detection = None
_cached_lock = threading.Lock()

# Connected SSE clients - each client gets its own queue.
_sse_clients = []           # list[queue.Queue]
_sse_lock = threading.Lock()

# Last broadcast event (so a new client connecting mid-session sees current state)
_last_broadcast = None


def _build_twi_alert(status: str, confidence: float, advice: str = "") -> tuple[str, str, bytes]:
    """
    Build the English advisory text using Gemini, translate to Twi via Khaya,
    and synthesise to Twi speech audio using Meta MMS-TTS Akan.
    Returns (english_text, twi_text, audio_wav_bytes).
    """
    disease = DISEASE_DISPLAY_NAMES.get(status, status.replace("_", " ").title())
    pct = int(round(confidence * 100)) if confidence <= 1.0 else int(confidence)
    
    if status == "healthy":
        prompt = (
            SYSTEM_PROMPT
            + f"\n\nThe camera scanned the farmer's cocoa pod and confirmed it is HEALTHY with {pct}% confidence. "
            + "Give a warm, positive response in 2 short sentences encouraging the farmer and giving a brief tip on regular weeding and monitoring. Reply in plain English."
        )
    else:
        advice_context = f" Standard treatment: {advice}" if advice else ""
        prompt = (
            SYSTEM_PROMPT
            + f"\n\nThe camera detected {disease} on the farmer's cocoa pod with {pct}% confidence.{advice_context} "
            + "Provide 2 to 3 clear, practical, and highly actionable sentences for the farmer on immediate steps (e.g. prune and bury infected pods, apply copper fungicide, clean farm tools). Reply in plain English."
        )
    
    try:
        gemini_response = gemini_client.models.generate_content(
            model=GEMINI_MODEL, contents=prompt
        )
        english_alert = (gemini_response.text or "").strip()
    except Exception as e:
        print(f"  (Gemini failed, using fallback alert: {e})")
        english_alert = advice if advice else f"{disease} detected with {pct}% confidence. Remove affected pods and consult your cocoa officer."

    # Translate to Twi via Khaya
    try:
        translated = nlp.translate(english_alert, language_pair="en-tw")
        twi_alert = extract_text(translated)
    except Exception as e:
        print(f"  (Twi translation failed: {e})")
        twi_alert = english_alert   # fallback - MMS-TTS will still try

    # Synthesise with Meta MMS-TTS Akan
    try:
        audio_bytes = synthesize_twi_audio(twi_alert)
    except Exception as e:
        print(f"  (alert TTS failed: {e})")
        audio_bytes = b""

    return english_alert, twi_alert, audio_bytes


def _broadcast(event_obj):
    """Send an event to all connected SSE clients. Cleans up dead connections."""
    global _last_broadcast
    _last_broadcast = event_obj

    payload = json.dumps(event_obj)
    with _sse_lock:
        dead = []
        for q in _sse_clients:
            try:
                q.put_nowait(payload)
            except queue.Full:
                dead.append(q)
        for q in dead:
            _sse_clients.remove(q)


# ===== Helpers =====
def webm_to_wav(webm_bytes: bytes) -> bytes:
    """Convert browser WebM/Opus to 16 kHz mono WAV (what Khaya wants)."""
    audio = AudioSegment.from_file(io.BytesIO(webm_bytes))
    audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)
    out = io.BytesIO()
    audio.export(out, format="wav")
    return out.getvalue()


def extract_text(api_response) -> str:
    """
    Khaya endpoints sometimes return a raw string, sometimes a JSON object.
    This pulls a usable string out of either.
    """
    if isinstance(api_response, str):
        return api_response
    if isinstance(api_response, dict):
        for key in ("text", "transcript", "translation", "result", "output"):
            if key in api_response and isinstance(api_response[key], str):
                return api_response[key]
        if "message" in api_response:
            raise RuntimeError(f"Khaya error: {api_response}")
    return str(api_response)


def needs_image_context(english_text: str) -> bool:
    """Is the farmer asking about a pod? (simple keyword check)"""
    lower = english_text.lower()
    return any(kw in lower for kw in POD_KEYWORDS)


def fetch_latest_detection():
    """
    Pull the most recent detection from the image server, if reachable.
    Used as a fallback if no /notify has been received yet.
    """
    with _cached_lock:
        if _cached_detection is not None:
            return _cached_detection
    try:
        r = requests.get(f"{IMAGE_SERVER_URL}/last", timeout=3)
        if r.status_code == 200:
            return r.json()
    except Exception as e:
        print(f"  (could not reach image server: {e})")
    return None


# ===== Endpoints =====
@app.route("/", methods=["GET"])
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "online",
        "service": "Cocoa Voice + AI Advisor",
        "model": GEMINI_MODEL,
        "mms_tts": "ready",
        "sse_clients": len(_sse_clients)
    })


@app.route("/advisory", methods=["POST"])
@app.route("/notify", methods=["POST"])
def generate_advisory():
    """
    Generates agricultural advice in English (Gemini), translates to Twi (Khaya),
    and synthesizes spoken Twi audio (Meta MMS-TTS).
    Broadcasts the alert to SSE clients and returns the complete payload to the caller.
    """
    global _cached_detection

    payload = request.get_json(silent=True) or {}
    
    # Handle detection object if wrapped or direct
    detection = payload.get("detection") if "detection" in payload else payload
    status = detection.get("status", "healthy")
    
    primary = detection.get("primary_detection") or {}
    confidence = float(primary.get("confidence", 0.95))
    built_in_advice = detection.get("advice", "")

    # Cache for voice queries
    with _cached_lock:
        _cached_detection = detection

    print(f"\n[ADVISORY] Processing scan result: {status} ({int(confidence*100)}%)")
    print("  1. Generating advice with Gemini AI...")
    english_alert, twi_alert, audio_bytes = _build_twi_alert(status, confidence, built_in_advice)
    print(f"  2. English advice: {english_alert}")
    print(f"  3. Twi translation: {twi_alert}")
    print(f"  4. MMS-TTS synthesized: {len(audio_bytes)} bytes audio")

    event = {
        "success": True,
        "type": "detection",
        "status": status,
        "confidence": confidence,
        "english_alert": english_alert,
        "twi_alert": twi_alert,
        "detection": detection,
        "audio_base64": base64.b64encode(audio_bytes).decode("ascii") if audio_bytes else "",
        "audio_mime": "audio/wav",
        "timestamp": datetime.now().isoformat(),
    }

    # Broadcast to SSE clients
    _broadcast(event)

    return jsonify(event)


@app.route("/stream", methods=["GET"])
def stream():
    """
    Server-Sent Events endpoint. Browser connects with EventSource(...) and
    receives JSON detection events as they arrive.
    """
    @stream_with_context
    def event_generator():
        client_queue = queue.Queue(maxsize=20)
        with _sse_lock:
            _sse_clients.append(client_queue)
        print(f"[SSE] Client connected (total: {len(_sse_clients)})")

        # Replay the last broadcast event so a freshly-connecting client
        # immediately sees the current alert (if any).
        if _last_broadcast is not None:
            yield f"data: {json.dumps(_last_broadcast)}\n\n"

        try:
            while True:
                try:
                    payload = client_queue.get(timeout=20)
                    yield f"data: {payload}\n\n"
                except queue.Empty:
                    # Heartbeat keeps the connection alive through proxies / load balancers
                    yield ": heartbeat\n\n"
        except GeneratorExit:
            pass
        finally:
            with _sse_lock:
                if client_queue in _sse_clients:
                    _sse_clients.remove(client_queue)
            print(f"[SSE] Client disconnected (remaining: {len(_sse_clients)})")

    return Response(event_generator(), mimetype="text/event-stream",
                    headers={
                        "Cache-Control": "no-cache, no-transform",
                        "X-Accel-Buffering": "no",
                        "Connection": "keep-alive",
                    })


@app.route("/voice", methods=["POST"])
def voice():
    """
    Main endpoint. Browser sends audio as multipart form field 'audio'.
    Returns JSON:
      {
        twi_transcript:    "...",
        english_transcript:"...",
        english_reply:     "...",
        twi_reply:         "...",
        detection:         {...} | null,
        audio_base64:      "...",
        audio_mime:        "audio/wav"
      }
    """
    if "audio" not in request.files:
        return jsonify({"error": "no audio file (form field 'audio') in request"}), 400

    webm_bytes = request.files["audio"].read()
    if not webm_bytes:
        return jsonify({"error": "empty audio"}), 400

    # 1. Convert to WAV
    try:
        wav_bytes = webm_to_wav(webm_bytes)
    except Exception as e:
        return jsonify({"error": f"audio conversion failed (is ffmpeg installed?): {e}"}), 500

    # 2. Save WAV to a temp file (the ghana-nlp library expects a path)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        f.write(wav_bytes)
        wav_path = f.name

    try:
        # 3. STT: Twi audio -> Twi text
        print("\n[1/6] Transcribing...")
        stt_resp = nlp.stt(wav_path, language=LANGUAGE_CODE)
        twi_text = extract_text(stt_resp)
        print(f"      Twi:     {twi_text}")
        if not twi_text.strip():
            return jsonify({"error": "could not transcribe audio - is the mic working?"}), 500

        # 4. Translate Twi -> English
        print("[2/6] Translating to English...")
        tr_resp = nlp.translate(twi_text, language_pair="tw-en")
        english_text = extract_text(tr_resp)
        print(f"      English: {english_text}")

        # 5. If farmer is asking about a pod, attach the latest detection.
        # The detection is cached by /notify (image server pushes to us).
        detection_context = ""
        latest = None
        if needs_image_context(english_text):
            print("[3/6] Fetching cached pod detection...")
            with _cached_lock:
                latest = _cached_detection
            if latest and latest.get("status") and latest["status"] != "no_pod_detected":
                conf = (latest.get("primary_detection") or {}).get("confidence", "n/a")
                detection_context = (
                    f"\n\nContext from the bot's camera (most recent analysis): "
                    f"{latest['status']} (confidence {conf}). "
                    f"Built-in advice for this condition: {latest.get('advice', '')}"
                )
                print(f"      attached: {latest['status']}")
            else:
                print("      no detection cached yet")
        else:
            print("[3/6] No pod-related keywords; skipping image context.")

        # 6. Ask Gemini
        print("[4/6] Generating advice with Gemini...")
        full_prompt = (
            SYSTEM_PROMPT
            + "\n\nFarmer says (translated from Twi): " + english_text
            + detection_context
        )
        gemini_response = gemini_client.models.generate_content(
            model=GEMINI_MODEL, contents=full_prompt
        )
        english_reply = (gemini_response.text or "").strip()
        print(f"      Reply:   {english_reply}")

        # 7. Translate English -> Twi
        print("[5/6] Translating reply to Twi...")
        tw_reply_resp = nlp.translate(english_reply, language_pair="en-tw")
        twi_reply = extract_text(tw_reply_resp)

        # 8. TTS: Twi text -> Twi audio (using Meta MMS-TTS, runs locally)
        print("[6/6] Generating speech with MMS-TTS...")
        twi_audio_bytes = synthesize_twi_audio(twi_reply)

        # 9. Build response
        return jsonify({
            "twi_transcript":    twi_text,
            "english_transcript": english_text,
            "english_reply":     english_reply,
            "twi_reply":         twi_reply,
            "detection":         latest,
            "audio_base64":      base64.b64encode(twi_audio_bytes).decode("ascii"),
            "audio_mime":        "audio/wav",
        })

    except Exception as e:
        print(f"Pipeline error: {e}")
        return jsonify({"error": f"pipeline failed: {e}"}), 500
    finally:
        try:
            os.unlink(wav_path)
        except OSError:
            pass


if __name__ == "__main__":
    if "PUT_YOUR" in GHANA_NLP_API_KEY or "PUT_YOUR" in GEMINI_API_KEY:
        print("\nWARNING: One or more API keys are not set.")
        print("  Set GHANA_NLP_API_KEY and GEMINI_API_KEY before running.")
        print("  Get Khaya key:   https://translation.ghananlp.org")
        print("  Get Gemini key:  https://aistudio.google.com/app/apikey\n")

    app.run(host="0.0.0.0", port=5001, debug=False)