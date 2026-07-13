# Smart Cocoa - Full Pipeline

End-to-end system: ESP32-CAM bot, image recognition, and Twi voice advisory, all running on one laptop.

```
[ESP32-CAM] --WiFi--> [Laptop :5000 image server (YOLO)]
[Browser]   --WiFi--> [Laptop :5001 voice server (Khaya + Gemini)]
                          |
                          +-- calls /last on :5000 when farmer asks about a pod
```

## Files

| File | Where it runs | What it does |
|---|---|---|
| `train_cocoa_yolo.py` | Google Colab | Trains the disease detection model |
| `inference_server.py` | Your laptop (port 5000) | Runs YOLO on incoming images |
| `voice_server.py` | Your laptop (port 5001) | STT to LLM to TTS pipeline |
| `web_app/index.html` | Any browser | Mic button, plays back the Twi advice |
| `esp32_cam_client.ino` | ESP32-CAM bot | Captures and POSTs photos |
| `test_server.py` | Your laptop | Test the image server without the ESP32 |
| `requirements.txt` | Your laptop | All Python dependencies |

---

## Step-by-step setup

### Step 1 — Train the model (Colab)
1. Open `train_cocoa_yolo.py` in Google Colab, GPU runtime.
2. Use a Roboflow cocoa-disease dataset (paste their snippet into Cell 2) or your own.
3. Run all cells. Download `best.pt` to the folder where you'll run the servers.

### Step 2 — Install Python dependencies
```bash
pip install -r requirements.txt
```

### Step 3 — Install ffmpeg (needed for audio conversion)
- **Linux**:   `sudo apt install ffmpeg`
- **Mac**:     `brew install ffmpeg`
- **Windows**: download from https://www.gyan.dev/ffmpeg/builds/ (the "release essentials" build), extract, and add the `bin/` folder to your PATH. Restart terminal after.

Verify with: `ffmpeg -version`

### Step 4 — Get API keys and set up .env
1. **Khaya (GhanaNLP)** — sign up at https://translation.ghananlp.org, subscribe to the free tier, copy your subscription key.
2. **Gemini** — go to https://aistudio.google.com/app/apikey, create a key. No credit card required for the free tier.

Open the `.env` file (already created for you in the project folder) and paste your keys in place of the placeholders:

```
GHANA_NLP_API_KEY=your-khaya-key-here
GEMINI_API_KEY=your-gemini-key-here
```

`.env` is in `.gitignore` so it won't be committed to git. **Never paste real keys in chat, screenshots, or commit them to a repo** — if you do, revoke the key immediately at the provider's dashboard and create a new one.

### Step 5 — Start both servers (two separate terminals)

**Terminal 1** - image server:
```bash
python inference_server.py
```
Should print `Loading model from best.pt ...` and start on port 5000.

**Terminal 2** - voice server:
```bash
python voice_server.py
```
Should print initialization messages and start on port 5001.

### Step 6 — Open the web app
1. Open `web_app/index.html` in any browser (just double-click the file).
2. Allow microphone access when prompted.
3. Tap the mic button, say something in Twi like "Me cocoa pod no ho yɛ den?" (How is my cocoa pod?), tap again to stop.
4. Wait a few seconds while it transcribes, thinks, and synthesizes the reply.
5. You should see all the transcripts and hear the response in Twi.

### Step 7 — Flash the ESP32-CAM
See the previous setup steps in the `.ino` file. Once flashed, the bot starts sending photos every 10 seconds to the image server. The image server keeps the latest detection in memory, and the voice server pulls it whenever you ask about a pod.

---

## Testing the integration

Try asking these to see different code paths fire:

| You say (in Twi)                             | What happens                                                                 |
|----------------------------------------------|------------------------------------------------------------------------------|
| "How are you?" (no pod keywords)             | Voice server skips the image fetch; Gemini gives general response            |
| "Is my pod sick?" (pod keyword detected)     | Voice server pulls `/last` from image server, includes detection in prompt   |
| "What disease is on the pod?"                | Same as above; the advice should reflect what was detected                   |

Watch both server terminals — you'll see exactly which steps fire on each request.

---

## Testing on your phone

The web app works on a phone browser too, as long as the phone is on the same WiFi as your laptop:
1. Find your laptop's IP (`ipconfig` / `ifconfig`).
2. In `web_app/index.html`, change `const VOICE_SERVER = "http://localhost:5001/voice"` to `"http://YOUR_LAPTOP_IP:5001/voice"`.
3. Either email the HTML file to your phone, or serve it: `cd web_app && python -m http.server 8080` then open `http://YOUR_LAPTOP_IP:8080` on your phone.
4. **Important**: browser microphone access on mobile only works over HTTPS or on localhost. For testing on a phone, use Chrome's flag `chrome://flags/#unsafely-treat-insecure-origin-as-secure` and add your laptop's IP to the allowlist. For real deployment you'd put this behind HTTPS.

---

## Common issues

- **`audio conversion failed`**: ffmpeg isn't installed or isn't on PATH. Verify with `ffmpeg -version`.
- **`Khaya error: ... 401`**: API key is wrong or hasn't been activated. Check the Khaya dashboard.
- **`429 rate limit`**: Gemini free tier limit hit. Wait a minute and try again.
- **`CORS` errors in browser console**: Both servers have `flask-cors` enabled, but if you customized things, make sure it's installed and called.
- **Mic button does nothing on phone**: HTTPS issue, see "Testing on your phone" above.
- **Empty Twi transcript**: Khaya STT on noisy audio or unclear speech sometimes returns empty. Speak close to the mic, in a quiet room, in clear Twi.
- **ESP32 not connecting**: see the comments at the top of `esp32_cam_client.ino`. Most often it's WiFi password, client isolation on campus WiFi, or wrong laptop IP.

---

## What works without doing all of this

You don't have to wire up everything to test pieces:
- **Just the image server**: works alone with `test_server.py` and a local image.
- **Just the voice server**: works alone, opens the web app, asks general questions. The "pod" advice will say "no detections yet" but the rest of the pipeline works.
- **Both servers, no ESP32**: full voice advisory works; pod-specific queries get "no_detections_yet" from `/last`.
- **All three (servers + ESP32)**: full experience.

Build it up in that order. Each layer fails on its own; don't try to debug everything at once.
