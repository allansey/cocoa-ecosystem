"""
Image Inference Server - Cocoa Disease Detection & ESP32-CAM Stream
====================================================================
Runs on port 5002. Receives uploaded images or connects directly to
the ESP32-CAM live stream (http://192.168.137.226:81/stream) to run YOLOv8
inference using the trained cocoa_best.pt model.
"""

import os
import io
import tempfile
import threading
import requests
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from PIL import Image
from ultralytics import YOLO

# 1. Load the YOLO model
MODEL_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "cocoa-ai-20260603T074613Z-3-001",
    "cocoa-ai",
    "models",
    "cocoa_best.pt"
)
print(f"Loading YOLO model from {MODEL_PATH}...")
model = YOLO(MODEL_PATH)
print(f"Model loaded. Classes: {model.names}")

app = Flask(__name__)
CORS(app)

# Default ESP32-CAM stream URL
CAMERA_STREAM_URL = os.environ.get("CAMERA_STREAM_URL", "http://192.168.137.164:81/stream")

# In-memory store for the latest detection
latest_detection = {
    "status": "no_detections_yet",
    "primary_detection": None,
    "advice": ""
}

# Advice lookup by status
ADVICE = {
    "healthy": "Your cocoa pod is healthy! Continue regular weeding, pruning, and monitoring.",
    "black_pod_rot": "Detected Black Pod Rot (Phytophthora). Remove and bury infected pods immediately. Spray copper-based fungicide and prune surrounding trees to reduce shade and humidity.",
    "frosty_pod_rot": "Detected Frosty Pod Rot (Moniliophthora). Harvest infected pods carefully before they form white powdery spores, bury them, and clean tools to prevent spreading.",
}


def _notify_voice_server(det_payload):
    """Notify the Voice + AI Advisor server (port 5001) in background."""
    def _post():
        try:
            voice_url = os.environ.get("VOICE_SERVER_URL", "http://localhost:5001")
            requests.post(f"{voice_url}/notify", json=det_payload, timeout=15)
            print(f"[YOLO] Notified voice server ({voice_url}) about: {det_payload.get('status')}")
        except Exception as e:
            print(f"[YOLO] Background notify to voice server: {e}")

    threading.Thread(target=_post, daemon=True).start()


def perform_yolo_inference(image_input):
    """Run YOLOv8 prediction on an image file path or PIL Image."""
    global latest_detection

    results = model(image_input)
    boxes = results[0].boxes

    if len(boxes) == 0:
        status = "healthy"
        confidence = 1.0
        print("[YOLO] No disease detections found — classified as healthy")
    else:
        # Get detection with highest confidence
        best_box = max(boxes, key=lambda x: float(x.conf[0]))
        class_id = int(best_box.cls[0])
        confidence = round(float(best_box.conf[0]), 4)
        class_name = model.names[class_id]

        # Model classes: {0: 'healthy', 1: 'monilia', 2: 'phytophthora'}
        if class_name == "healthy":
            status = "healthy"
        elif class_name == "monilia":
            status = "frosty_pod_rot"
        elif class_name == "phytophthora":
            status = "black_pod_rot"
        else:
            status = class_name

        print(f"[YOLO] Detected: {class_name} -> {status} (confidence {confidence})")

    advice = ADVICE.get(status, f"Detected condition: {status}. Consult your local extension officer.")

    latest_detection = {
        "status": status,
        "primary_detection": {"confidence": confidence},
        "advice": advice
    }

    # Trigger speech/advisory pipeline
    _notify_voice_server(latest_detection)

    return latest_detection


def grab_frame_from_camera(stream_url=None):
    """Grab a single frame from the ESP32-CAM stream or capture endpoint."""
    url = stream_url or CAMERA_STREAM_URL
    print(f"[YOLO] Grabbing snapshot frame from ESP32-CAM at: {url} ...")

    # 1. Try direct capture URL (e.g., /capture on port 80/81)
    capture_urls = [
        url.replace(":81/stream", "/capture").replace("/stream", "/capture"),
        url.replace(":81/stream", ":80/capture"),
        url
    ]

    for c_url in capture_urls:
        try:
            r = requests.get(c_url, timeout=3)
            if r.status_code == 200 and len(r.content) > 1000:
                return Image.open(io.BytesIO(r.content))
        except Exception:
            continue

    # 2. Extract single frame from MJPEG stream
    try:
        r = requests.get(url, stream=True, timeout=6)
        bytes_buf = b""
        for chunk in r.iter_content(chunk_size=1024):
            bytes_buf += chunk
            start = bytes_buf.find(b"\xff\xd8")  # JPEG start
            end = bytes_buf.find(b"\xff\xd9")    # JPEG end
            if start != -1 and end != -1 and end > start:
                jpg_data = bytes_buf[start:end + 2]
                return Image.open(io.BytesIO(jpg_data))
    except Exception as e:
        print(f"[YOLO] Failed to extract frame from stream {url}: {e}")

    return None


# ------------------------------------------------------------------------------
# API Endpoints
# ------------------------------------------------------------------------------

@app.route("/", methods=["GET"])
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "yolo_inference_server",
        "camera_stream_url": CAMERA_STREAM_URL,
        "model_classes": model.names
    })


@app.route("/camera-config", methods=["GET", "POST"])
def camera_config():
    """Get or update the active ESP32-CAM stream URL."""
    global CAMERA_STREAM_URL
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        new_url = data.get("streamUrl") or request.form.get("streamUrl")
        if new_url:
            CAMERA_STREAM_URL = new_url.strip()
            print(f"[YOLO] Updated ESP32-CAM stream URL to: {CAMERA_STREAM_URL}")
            return jsonify({"success": True, "camera_stream_url": CAMERA_STREAM_URL})
        return jsonify({"error": "Missing streamUrl parameter"}), 400

    return jsonify({"camera_stream_url": CAMERA_STREAM_URL})


@app.route("/last", methods=["GET"])
def get_last():
    return jsonify(latest_detection)


@app.route("/upload", methods=["POST"])
def upload():
    """Receive an uploaded image file via multipart form-data."""
    if "image" not in request.files:
        return jsonify({"error": "No image file provided. Send as multipart 'image' field."}), 400

    file = request.files["image"]
    if not file.filename:
        return jsonify({"error": "No file selected"}), 400

    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as temp_img:
        file.save(temp_img.name)
        temp_path = temp_img.name

    try:
        detection = perform_yolo_inference(temp_path)
        return jsonify({
            "success": True,
            "message": f"YOLOv8 analysis complete: {detection['status']}",
            "detection": detection
        })
    except Exception as e:
        print(f"[YOLO] Error: {e}")
        return jsonify({"error": f"Model inference failed: {str(e)}"}), 500
    finally:
        if os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except OSError:
                pass


@app.route("/scan-stream", methods=["GET", "POST"])
def scan_stream():
    """Grab a live frame from the ESP32-CAM stream and run YOLO."""
    json_data = request.get_json(silent=True) or {}
    stream_url = request.args.get("url") or json_data.get("url") or request.form.get("url") or CAMERA_STREAM_URL
    frame = grab_frame_from_camera(stream_url)

    if frame is None:
        return jsonify({
            "error": "Could not connect or fetch frame from ESP32-CAM stream.",
            "stream_url": stream_url,
            "suggestion": "Ensure ESP32-CAM is powered on and connected to the same Wi-Fi network (192.168.137.226)."
        }), 502

    try:
        detection = perform_yolo_inference(frame)
        return jsonify({
            "success": True,
            "message": f"Live ESP32-CAM frame analyzed: {detection['status']}",
            "stream_url": stream_url,
            "detection": detection
        })
    except Exception as e:
        print(f"[YOLO] Stream scan error: {e}")
        return jsonify({"error": f"Inference on live frame failed: {str(e)}"}), 500


@app.route("/video_feed", methods=["GET"])
def video_feed():
    """Relay live MJPEG video stream from ESP32-CAM to web browsers."""
    url = request.args.get("url") or CAMERA_STREAM_URL
    try:
        req = requests.get(url, stream=True, timeout=6)
        content_type = req.headers.get("content-type", "multipart/x-mixed-replace; boundary=frame")
        def _generate():
            try:
                for chunk in req.iter_content(chunk_size=4096):
                    if chunk:
                        yield chunk
            except Exception as e:
                print(f"[YOLO] Stream relay chunk notice: {e}")
        return Response(_generate(), content_type=content_type)
    except Exception as e:
        print(f"[YOLO] Video feed connection error: {e}")
        return jsonify({"error": f"Cannot connect to ESP32-CAM: {str(e)}"}), 502


@app.route("/reset", methods=["POST"])
def reset():
    global latest_detection
    latest_detection = {
        "status": "no_detections_yet",
        "primary_detection": None,
        "advice": ""
    }
    print("[YOLO] Detection state reset.")
    return jsonify({"success": True, "message": "State reset"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5002))
    print(f"Starting YOLOv8 Inference Server on port {port}...")
    print(f"Configured ESP32-CAM Stream URL: {CAMERA_STREAM_URL}")
    app.run(host="0.0.0.0", port=port, debug=False)
