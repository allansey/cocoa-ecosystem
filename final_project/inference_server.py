"""
Image Inference Server - Cocoa Disease Detection
=================================================
Runs on port 5000. Receives uploaded images, runs YOLOv8
inference using the trained cocoa_best.pt model, and returns
the classification result (healthy / monilia / phytophthora).
"""

import os
import tempfile
from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO

# Load the YOLO model
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


@app.route("/", methods=["GET"])
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "yolo_inference_server", "model_classes": model.names})


@app.route("/last", methods=["GET"])
def get_last():
    return jsonify(latest_detection)


@app.route("/upload", methods=["POST"])
def upload():
    global latest_detection

    if "image" not in request.files:
        return jsonify({"error": "No image file provided. Send as multipart 'image' field."}), 400

    file = request.files["image"]
    if not file.filename:
        return jsonify({"error": "No file selected"}), 400

    # Save to temp file for YOLO inference
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as temp_img:
        file.save(temp_img.name)
        temp_path = temp_img.name

    try:
        # Run YOLOv8 prediction
        results = model(temp_path)
        boxes = results[0].boxes

        if len(boxes) == 0:
            status = "healthy"
            confidence = 1.0
            print(f"[YOLO] No detections found — defaulting to healthy")
        else:
            # Get detection with highest confidence
            best_box = max(boxes, key=lambda x: float(x.conf[0]))
            class_id = int(best_box.cls[0])
            confidence = round(float(best_box.conf[0]), 4)
            class_name = model.names[class_id]

            # Map YOLO class names to our status keys
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

        return jsonify({
            "success": True,
            "message": f"YOLOv8 analysis complete: {status}",
            "detection": latest_detection
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

        # Notify the voice server in background thread (non-blocking)
        def _notify_async(det_payload):
            try:
                import requests
                requests.post("http://localhost:5001/notify", json=det_payload, timeout=15)
                print(f"[YOLO] Notified voice server (:5001) about: {det_payload.get('status')}")
            except Exception as e:
                print(f"[YOLO] Background notify to voice server: {e}")

        import threading
        threading.Thread(target=_notify_async, args=(latest_detection,), daemon=True).start()


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
    print("Starting YOLOv8 Inference Server on port 5002...")
    app.run(host="0.0.0.0", port=5002, debug=False)
