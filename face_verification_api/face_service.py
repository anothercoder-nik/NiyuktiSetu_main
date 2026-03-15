import cv2
import numpy as np
from deepface import DeepFace
import tensorflow as tf
import mediapipe as mp

DeepFace.build_model("ArcFace")
import time

tf.get_logger().setLevel('ERROR')

########################################
# MEDIAPIPE FACE MESH SETUP
########################################
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=True,
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5
)

# Landmark indices for eye blink detection (EAR)
# Left eye: [362, 385, 387, 263, 373, 380]
# Right eye: [33, 160, 158, 133, 153, 144]
LEFT_EYE = [362, 385, 387, 263, 373, 380]
RIGHT_EYE = [33, 160, 158, 133, 153, 144]

# Head pose estimation landmarks
NOSE_TIP = 1
CHIN = 152
LEFT_EYE_CORNER = 263
RIGHT_EYE_CORNER = 33
LEFT_MOUTH = 287
RIGHT_MOUTH = 57
FOREHEAD = 10

########################################
# MULTI-FACE DETECTION (Haar Cascade)
########################################
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

def count_faces(image_bgr):
    """
    Count the number of faces in an image using Haar Cascade.
    Returns: { face_count, faces_detected, bounding_boxes }
    """
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)
    
    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(60, 60),
        flags=cv2.CASCADE_SCALE_IMAGE
    )
    
    face_count = len(faces)
    boxes = [{"x": int(x), "y": int(y), "w": int(w), "h": int(h)} for (x, y, w, h) in faces]
    
    return {
        "face_count": face_count,
        "faces_detected": face_count > 0,
        "multiple_faces": face_count > 1,
        "bounding_boxes": boxes
    }

########################################
# MATH UTILITIES
########################################
def l2_normalize(vec):
    vec = np.array(vec, dtype=np.float32)
    n = np.linalg.norm(vec)
    if n == 0:
        return vec
    return vec / n


def cosine_similarity(vec1, vec2):
    return float(np.dot(
        np.array(vec1, dtype=np.float32),
        np.array(vec2, dtype=np.float32)
    ))


########################################
# FACE VERIFICATION (ArcFace + MTCNN)
########################################
def get_embedding(image_input):
    """Get face embedding from image path or numpy array."""
    try:
        reps = DeepFace.represent(
            image_input,
            model_name="ArcFace",
            detector_backend="mtcnn",
            enforce_detection=True
        )
        if not reps:
            return None
        return l2_normalize(reps[0]["embedding"])
    except Exception as e:
        print(f"⚠️ Embedding extraction failed: {e}")
        return None


def verify_faces(ref_input, live_input, threshold=0.55):
    """
    Compare two face images.
    Returns: (match: bool, score: float, quality: dict)
    """
    ref_emb = get_embedding(ref_input)
    live_emb = get_embedding(live_input)

    if ref_emb is None or live_emb is None:
        return False, 0.0, {"error": "Face not detected in one or both images"}

    score = cosine_similarity(ref_emb, live_emb)
    match = score >= threshold

    quality = {
        "cosine_similarity": round(float(score), 4),
        "threshold": threshold,
        "ref_detected": ref_emb is not None,
        "live_detected": live_emb is not None,
    }

    return match, float(score), quality


########################################
# EYE BLINK DETECTION (EAR)
########################################
def eye_aspect_ratio(landmarks, eye_indices, w, h):
    """Calculate Eye Aspect Ratio for blink detection."""
    pts = [(landmarks[i].x * w, landmarks[i].y * h) for i in eye_indices]
    
    # Vertical distances
    v1 = np.linalg.norm(np.array(pts[1]) - np.array(pts[5]))
    v2 = np.linalg.norm(np.array(pts[2]) - np.array(pts[4]))
    # Horizontal distance
    h1 = np.linalg.norm(np.array(pts[0]) - np.array(pts[3]))
    
    if h1 == 0:
        return 0.3
    
    ear = (v1 + v2) / (2.0 * h1)
    return ear


def detect_blink(image_bgr):
    """
    Detect if eyes are blinking in the image.
    Returns: { blink_detected, left_ear, right_ear, avg_ear }
    """
    h, w = image_bgr.shape[:2]
    rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(rgb)

    if not results.multi_face_landmarks:
        return {"blink_detected": False, "error": "No face detected", "avg_ear": 0}

    landmarks = results.multi_face_landmarks[0].landmark

    left_ear = eye_aspect_ratio(landmarks, LEFT_EYE, w, h)
    right_ear = eye_aspect_ratio(landmarks, RIGHT_EYE, w, h)
    avg_ear = (left_ear + right_ear) / 2.0

    # EAR below 0.21 = eyes closed (blink)
    blink_detected = bool(avg_ear < 0.21)

    return {
        "blink_detected": blink_detected,
        "left_ear": round(left_ear, 4),
        "right_ear": round(right_ear, 4),
        "avg_ear": round(avg_ear, 4),
        "threshold": 0.21
    }


########################################
# HEAD POSE ESTIMATION
########################################
def estimate_head_pose(image_bgr):
    """
    Estimate head yaw (left/right) and pitch (up/down).
    Returns: { yaw, pitch, direction, face_detected }
    """
    h, w = image_bgr.shape[:2]
    rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(rgb)

    if not results.multi_face_landmarks:
        return {"face_detected": False, "error": "No face detected"}

    landmarks = results.multi_face_landmarks[0].landmark

    # 3D model points (generic human face proportions)
    model_points = np.array([
        (0.0, 0.0, 0.0),         # Nose tip
        (0.0, -63.6, -12.5),     # Chin
        (-43.3, 32.7, -26.0),    # Left eye corner
        (43.3, 32.7, -26.0),     # Right eye corner
        (-28.9, -28.9, -24.1),   # Left mouth
        (28.9, -28.9, -24.1),    # Right mouth
    ], dtype=np.float64)

    # 2D image points from landmarks
    image_points = np.array([
        (landmarks[NOSE_TIP].x * w, landmarks[NOSE_TIP].y * h),
        (landmarks[CHIN].x * w, landmarks[CHIN].y * h),
        (landmarks[LEFT_EYE_CORNER].x * w, landmarks[LEFT_EYE_CORNER].y * h),
        (landmarks[RIGHT_EYE_CORNER].x * w, landmarks[RIGHT_EYE_CORNER].y * h),
        (landmarks[LEFT_MOUTH].x * w, landmarks[LEFT_MOUTH].y * h),
        (landmarks[RIGHT_MOUTH].x * w, landmarks[RIGHT_MOUTH].y * h),
    ], dtype=np.float64)

    # Camera matrix approximation
    focal_length = w
    center = (w / 2, h / 2)
    camera_matrix = np.array([
        [focal_length, 0, center[0]],
        [0, focal_length, center[1]],
        [0, 0, 1]
    ], dtype=np.float64)

    dist_coeffs = np.zeros((4, 1))

    success, rotation_vec, translation_vec = cv2.solvePnP(
        model_points, image_points, camera_matrix, dist_coeffs,
        flags=cv2.SOLVEPNP_ITERATIVE
    )

    if not success:
        return {"face_detected": True, "error": "Pose estimation failed"}

    # Convert rotation vector to angles
    rotation_mat, _ = cv2.Rodrigues(rotation_vec)
    pose_mat = cv2.hconcat((rotation_mat, translation_vec))
    _, _, _, _, _, _, euler_angles = cv2.decomposeProjectionMatrix(
        cv2.hconcat((rotation_mat, translation_vec.reshape(3, 1)))
    )

    pitch = float(euler_angles[0][0])  # Up/Down
    yaw = float(euler_angles[1][0])    # Left/Right
    roll = float(euler_angles[2][0])   # Tilt

    # Determine direction
    direction = "center"
    if yaw < -15:
        direction = "left"
    elif yaw > 15:
        direction = "right"
    elif pitch < -15:
        direction = "up"
    elif pitch > 15:
        direction = "down"

    return {
        "face_detected": True,
        "yaw": round(yaw, 2),
        "pitch": round(pitch, 2),
        "roll": round(roll, 2),
        "direction": direction
    }


########################################
# MOTION DETECTION (Anti-Photo Attack)
########################################
def detect_motion(frame1_bgr, frame2_bgr, min_motion_threshold=500):
    """
    Compare two consecutive frames to detect motion.
    Static images (photo attacks) will show nearly zero motion.
    """
    gray1 = cv2.cvtColor(frame1_bgr, cv2.COLOR_BGR2GRAY)
    gray2 = cv2.cvtColor(frame2_bgr, cv2.COLOR_BGR2GRAY)
    gray1 = cv2.GaussianBlur(gray1, (21, 21), 0)
    gray2 = cv2.GaussianBlur(gray2, (21, 21), 0)

    diff = cv2.absdiff(gray1, gray2)
    _, thresh = cv2.threshold(diff, 25, 255, cv2.THRESH_BINARY)
    motion_pixels = np.sum(thresh > 0)

    is_alive = motion_pixels > min_motion_threshold

    return {
        "motion_detected": bool(is_alive),
        "motion_pixels": int(motion_pixels),
        "threshold": min_motion_threshold
    }


########################################
# FACE QUALITY CHECK
########################################
def check_face_quality(image_bgr):
    """
    Check if the face image meets minimum quality standards.
    """
    h, w = image_bgr.shape[:2]
    rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(rgb)

    if not results.multi_face_landmarks:
        return {"quality": "poor", "face_detected": False, "score": 0}

    landmarks = results.multi_face_landmarks[0].landmark

    # Calculate face bounding box from landmarks
    xs = [lm.x * w for lm in landmarks]
    ys = [lm.y * h for lm in landmarks]
    face_w = max(xs) - min(xs)
    face_h = max(ys) - min(ys)
    face_area = face_w * face_h
    image_area = w * h
    face_ratio = face_area / image_area if image_area > 0 else 0

    # Brightness check
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    brightness = np.mean(gray)

    # Blur check (Laplacian variance)
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()

    # Quality scoring
    score = 0
    issues = []

    if face_ratio > 0.05:
        score += 30
    else:
        issues.append("Face too small")

    if 50 < brightness < 200:
        score += 30
    else:
        issues.append("Poor lighting")

    if laplacian_var > 50:
        score += 20
    else:
        issues.append("Image too blurry")

    if face_w > 80 and face_h > 80:
        score += 20
    else:
        issues.append("Low resolution face")

    quality = "good" if score >= 80 else "fair" if score >= 50 else "poor"

    return {
        "quality": quality,
        "score": score,
        "face_detected": True,
        "face_size": f"{int(face_w)}x{int(face_h)}",
        "brightness": round(brightness, 1),
        "sharpness": round(laplacian_var, 1),
        "face_ratio": round(face_ratio, 4),
        "issues": issues
    }


########################################
# COMBINED LIVENESS CHECK
########################################
def full_liveness_check(image_bgr, expected_action="blink"):
    """
    Run a full liveness check on a single frame.
    expected_action: 'blink', 'turn_left', 'turn_right', 'nod', 'face_present'
    """
    result = {
        "passed": False,
        "expected_action": expected_action,
        "face_detected": False,
        "details": {}
    }

    # Face quality
    quality = check_face_quality(image_bgr)
    result["details"]["quality"] = quality
    result["face_detected"] = quality["face_detected"]

    if not quality["face_detected"]:
        result["details"]["error"] = "No face detected in frame"
        return result

    if expected_action == "blink":
        blink = detect_blink(image_bgr)
        result["details"]["blink"] = blink
        result["passed"] = blink.get("blink_detected", False)

    elif expected_action == "turn_left":
        pose = estimate_head_pose(image_bgr)
        result["details"]["pose"] = pose
        result["passed"] = pose.get("direction") == "left"

    elif expected_action == "turn_right":
        pose = estimate_head_pose(image_bgr)
        result["details"]["pose"] = pose
        result["passed"] = pose.get("direction") == "right"

    elif expected_action == "nod":
        pose = estimate_head_pose(image_bgr)
        result["details"]["pose"] = pose
        result["passed"] = pose.get("direction") in ["up", "down"]

    elif expected_action == "face_present":
        result["passed"] = quality["face_detected"] and quality["score"] >= 50

    return result
