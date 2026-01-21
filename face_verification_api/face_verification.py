# app.py
import io
import json
import numpy as np
from typing import Optional, Tuple, Dict, Any

import cv2
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from deepface import DeepFace
import uvicorn

# -----------------------------
# Config
# -----------------------------
MODEL_NAME = "ArcFace"
DETECTOR = "mtcnn"
THRESHOLD = 0.60

app = FastAPI(title="Face Verification Service")

# -----------------------------
# Math utils
# -----------------------------
def l2_normalize(vec):
    v = np.array(vec, dtype=np.float32)
    n = np.linalg.norm(v)
    if n == 0:
        return v
    return v / n

def cosine_similarity(a, b):
    return float(np.dot(np.array(a, dtype=np.float32), np.array(b, dtype=np.float32)))

# -----------------------------
# Image/embedding helpers
# -----------------------------
def bytes_to_bgr_ndarray(img_bytes: bytes) -> np.ndarray:
    arr = np.frombuffer(img_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image bytes")
    return img

def embed_from_bytes(img_bytes: bytes) -> np.ndarray:
    # DeepFace accepts ndarray directly
    try:
        img = bytes_to_bgr_ndarray(img_bytes)
        rep = DeepFace.represent(
            img,
            model_name=MODEL_NAME,
            detector_backend=DETECTOR,
            enforce_detection=True
        )[0]["embedding"]
        return l2_normalize(rep)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Face detection/embedding failed: {str(e)}")

def embed_from_path(path: str) -> np.ndarray:
    try:
        rep = DeepFace.represent(
            path,
            model_name=MODEL_NAME,
            detector_backend=DETECTOR,
            enforce_detection=True
        )[0]["embedding"]
        return l2_normalize(rep)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Face detection/embedding failed: {str(e)}")

# -----------------------------
# DB adapter placeholder
# Replace get_user_record() with your real DB lookup
# It must return one of:
#   {"face_embedding": [floats, ...]}
#   or
#   {"reference_image_bytes": b"..."}     # raw image bytes from DB
#   or
#   {"reference_image_path": "/path/or/url.jpg"}
# -----------------------------
def get_user_record(roll: str, dob: str, rfid: str) -> Dict[str, Any]:
    """
    Implement this to read from your DB.

    Example Mongo doc you might return:
    return {
        "face_embedding": [...],  # preferred
        # OR "reference_image_bytes": binary_blob
        # OR "reference_image_path": "/data/passports/123.jpg"
    }
    """
    # TEMP demo: raise to force you to implement
    raise NotImplementedError("Implement get_user_record() to fetch face_embedding or reference image")

# -----------------------------
# Response model
# -----------------------------
class VerifyResponse(BaseModel):
    match: bool
    score: float
    threshold: float
    mode: str           # "embedding" or "reference_image"
    model: str
    detector: str

# -----------------------------
# Main endpoint
# -----------------------------
@app.post("/verify-face", response_model=VerifyResponse)
async def verify_face(
    roll: str = Form(...),
    dob: str = Form(...),          # e.g. "2003-11-07"
    rfid: str = Form(...),
    live_image: UploadFile = File(...)
):
    # 1) Get user record from DB
    try:
        user = get_user_record(roll, dob, rfid)
        if not isinstance(user, dict):
            raise ValueError("DB returned invalid record")
    except NotImplementedError as e:
        # Make it explicit during integration
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"User not found or DB error: {str(e)}")

    # 2) Compute live embedding
    live_bytes = await live_image.read()
    live_emb = embed_from_bytes(live_bytes)

    # 3) Compute reference embedding
    mode = None
    if "face_embedding" in user and user["face_embedding"]:
        ref_emb = l2_normalize(user["face_embedding"])
        mode = "embedding"
    elif "reference_image_bytes" in user and user["reference_image_bytes"]:
        ref_emb = embed_from_bytes(user["reference_image_bytes"])
        mode = "reference_image"
    elif "reference_image_path" in user and user["reference_image_path"]:
        ref_emb = embed_from_path(user["reference_image_path"])
        mode = "reference_image"
    else:
        raise HTTPException(status_code=422, detail="No face_embedding or reference image present for this user")

    # 4) Compare
    score = cosine_similarity(ref_emb, live_emb)
    match = score >= THRESHOLD

    return JSONResponse({
        "match": match,
        "score": round(score, 6),
        "threshold": THRESHOLD,
        "mode": mode,
        "model": MODEL_NAME,
        "detector": DETECTOR
    })

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8001)
