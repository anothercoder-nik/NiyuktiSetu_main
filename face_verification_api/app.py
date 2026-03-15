from flask import Flask, request, jsonify
from flask_cors import CORS
import tempfile
import os
import cv2
import numpy as np
import time
import json
from datetime import datetime
from face_service import (
    verify_faces,
    get_embedding,
    detect_blink,
    estimate_head_pose,
    detect_motion,
    check_face_quality,
    full_liveness_check,
    cosine_similarity,
    l2_normalize,
    count_faces
)

app = Flask(__name__)
CORS(app)

########################################
# IN-MEMORY SESSION STORAGE
########################################
# Stores reference embeddings for active interview sessions
# Key: rfid, Value: { embedding, reference_path, timestamp, re_verify_count }
active_sessions = {}

# Store reference images directory
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REFERENCE_DIR = os.path.join(SCRIPT_DIR, "reference_images")
if not os.path.exists(REFERENCE_DIR):
    os.makedirs(REFERENCE_DIR)
    print(f"📁 Created reference images directory: {REFERENCE_DIR}")


def bytes_to_cv2(file_bytes):
    """Convert uploaded file bytes to OpenCV BGR image."""
    nparr = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img


########################################
# 1. VERIFY — Compare two uploaded images
########################################
@app.route('/verify', methods=['POST'])
def verify():
    """
    Compare reference image (image1) with live image (image2).
    Also runs face quality check on both.
    """
    try:
        if 'image1' not in request.files or 'image2' not in request.files:
            return jsonify({
                'error': 'Both image1 (reference) and image2 (live) are required'
            }), 400

        image1 = request.files['image1']
        image2 = request.files['image2']

        temp_dir = tempfile.gettempdir()
        ref_path = os.path.join(temp_dir, f'ref_{int(time.time())}.jpg')
        live_path = os.path.join(temp_dir, f'live_{int(time.time())}.jpg')

        image1.save(ref_path)
        image2.save(live_path)

        print(f"🔍 Verifying: {ref_path} vs {live_path}")

        # Face verification
        match, score, quality_info = verify_faces(ref_path, live_path)

        # Quality check on live image
        live_img = cv2.imread(live_path)
        face_quality = check_face_quality(live_img) if live_img is not None else {}

        # Convert types
        match = bool(match)
        score = float(score)
        confidence = round(score * 100, 2)

        print(f"✅ Score: {score:.4f} ({confidence}%) | Match: {match}")

        # Cleanup
        for p in [ref_path, live_path]:
            try:
                os.remove(p)
            except:
                pass

        return jsonify({
            'match': match,
            'confidence': confidence,
            'score': score,
            'quality': face_quality,
            'verification_details': quality_info
        }), 200

    except Exception as e:
        print(f"❌ Error in /verify: {str(e)}")
        return jsonify({
            'error': str(e),
            'match': False,
            'confidence': 0
        }), 500


########################################
# 2. REGISTER REFERENCE — Store embedding for session
########################################
@app.route('/register-reference', methods=['POST'])
def register_reference():
    """
    Store a reference face embedding for an interview session.
    Used for mid-interview re-verification.
    """
    try:
        rfid = request.form.get('rfid')
        roll_no = request.form.get('roll_no')

        if not rfid:
            return jsonify({'error': 'RFID is required'}), 400

        if 'image' not in request.files:
            return jsonify({'error': 'Reference image is required'}), 400

        image_file = request.files['image']
        image_bytes = image_file.read()
        img = bytes_to_cv2(image_bytes)

        if img is None:
            return jsonify({'error': 'Invalid image data'}), 400

        # Quality check
        quality = check_face_quality(img)
        if not quality['face_detected']:
            return jsonify({
                'success': False,
                'error': 'No face detected in reference image',
                'quality': quality
            }), 400

        # Save reference image
        ref_filename = f"{rfid}_reference.jpg"
        ref_path = os.path.join(REFERENCE_DIR, ref_filename)
        cv2.imwrite(ref_path, img)

        # Extract and store embedding
        embedding = get_embedding(ref_path)
        if embedding is None:
            return jsonify({
                'success': False,
                'error': 'Could not extract face embedding'
            }), 400

        active_sessions[rfid] = {
            'embedding': embedding.tolist(),
            'reference_path': ref_path,
            'roll_no': roll_no,
            'registered_at': datetime.now().isoformat(),
            're_verify_count': 0,
            're_verify_results': []
        }

        print(f"✅ Reference registered for RFID: {rfid}")

        return jsonify({
            'success': True,
            'rfid': rfid,
            'quality': quality,
            'message': 'Reference face registered successfully'
        }), 200

    except Exception as e:
        print(f"❌ Error in /register-reference: {str(e)}")
        return jsonify({'error': str(e), 'success': False}), 500


########################################
# 3. LIVENESS CHECK — Detect blink/head turn
########################################
@app.route('/liveness-check', methods=['POST'])
def liveness_check():
    """
    Verify liveness with a specific action.
    Actions: 'blink', 'turn_left', 'turn_right', 'nod', 'face_present'
    """
    try:
        action = request.form.get('action', 'face_present')

        if 'frame' not in request.files:
            return jsonify({'error': 'Frame image is required'}), 400

        frame_file = request.files['frame']
        frame_bytes = frame_file.read()
        img = bytes_to_cv2(frame_bytes)

        if img is None:
            return jsonify({'error': 'Invalid frame data'}), 400

        print(f"🎯 Liveness check: action={action}")

        result = full_liveness_check(img, expected_action=action)

        print(f"   Result: passed={result['passed']}")

        return jsonify(result), 200

    except Exception as e:
        print(f"❌ Error in /liveness-check: {str(e)}")
        return jsonify({'error': str(e), 'passed': False}), 500


########################################
# 4. RE-VERIFY — Mid-interview anti-spoofing check
########################################
@app.route('/re-verify', methods=['POST'])
def re_verify():
    """
    Random mid-interview re-verification.
    Compares a live capture against the stored reference embedding.
    """
    try:
        rfid = request.form.get('rfid')

        if not rfid or rfid not in active_sessions:
            return jsonify({
                'error': 'No active session for this RFID',
                'match': False
            }), 400

        if 'image' not in request.files:
            return jsonify({'error': 'Live image is required'}), 400

        image_file = request.files['image']
        image_bytes = image_file.read()
        img = bytes_to_cv2(image_bytes)

        if img is None:
            return jsonify({'error': 'Invalid image data', 'match': False}), 400

        # Save temp live image for embedding extraction
        temp_path = os.path.join(tempfile.gettempdir(), f'reverify_{rfid}_{int(time.time())}.jpg')
        cv2.imwrite(temp_path, img)

        # Get live embedding
        live_emb = get_embedding(temp_path)

        # Cleanup
        try:
            os.remove(temp_path)
        except:
            pass

        if live_emb is None:
            return jsonify({
                'match': False,
                'confidence': 0,
                'error': 'No face detected in live capture',
                'alert': 'FACE_NOT_FOUND'
            }), 200

        # Compare against stored reference
        session = active_sessions[rfid]
        ref_emb = l2_normalize(session['embedding'])
        score = cosine_similarity(ref_emb, live_emb)
        match = score >= 0.50  # slightly lower threshold for candid captures

        confidence = round(float(score) * 100, 2)

        # Face quality
        quality = check_face_quality(img)

        # Track re-verification history
        session['re_verify_count'] += 1
        session['re_verify_results'].append({
            'timestamp': datetime.now().isoformat(),
            'match': bool(match),
            'confidence': confidence,
            'quality_score': quality.get('score', 0)
        })

        alert = None
        if not match:
            alert = 'IDENTITY_MISMATCH'
            print(f"🚨 RE-VERIFY ALERT: Identity mismatch for {rfid}! Score: {confidence}%")
        else:
            print(f"✅ RE-VERIFY OK: {rfid} | Score: {confidence}%")

        return jsonify({
            'match': bool(match),
            'confidence': confidence,
            'quality': quality,
            're_verify_count': session['re_verify_count'],
            'alert': alert
        }), 200

    except Exception as e:
        print(f"❌ Error in /re-verify: {str(e)}")
        return jsonify({'error': str(e), 'match': False, 'confidence': 0}), 500


########################################
# 4B. FACE COUNT — Detect multiple people
########################################
@app.route('/face-count', methods=['POST'])
def face_count():
    """
    Count how many faces are visible in the frame.
    Used for continuous monitoring during interviews.
    If more than 1 face is detected, it's a security violation.
    """
    try:
        if 'frame' not in request.files:
            return jsonify({'error': 'Frame image is required'}), 400

        frame_file = request.files['frame']
        frame_bytes = frame_file.read()
        img = bytes_to_cv2(frame_bytes)

        if img is None:
            return jsonify({'error': 'Invalid frame data'}), 400

        result = count_faces(img)

        if result['multiple_faces']:
            print(f"\U0001f6a8 ALERT: {result['face_count']} faces detected!")
        
        return jsonify(result), 200

    except Exception as e:
        print(f"\u274c Error in /face-count: {str(e)}")
        return jsonify({'error': str(e), 'face_count': 0}), 500


########################################
# 4C. COMBINED MONITOR — Face Count + Liveness in ONE call
########################################
@app.route('/monitor', methods=['POST'])
def monitor():
    """
    Combined endpoint: performs both face-count and liveness check
    on a single frame. Reduces network round-trips from 2 to 1.
    """
    try:
        if 'frame' not in request.files:
            return jsonify({'error': 'Frame image is required'}), 400

        frame_file = request.files['frame']
        frame_bytes = frame_file.read()
        img = bytes_to_cv2(frame_bytes)

        if img is None:
            return jsonify({'error': 'Invalid frame data'}), 400

        # Run both checks on the same decoded image
        face_result = count_faces(img)
        
        # Rotate liveness actions randomly — harder to spoof
        import random
        action = random.choice(['blink', 'turn_left', 'turn_right', 'face_present', 'face_present'])
        liveness_result = full_liveness_check(img, expected_action=action)

        if face_result['multiple_faces']:
            print(f"\U0001f6a8 MONITOR ALERT: {face_result['face_count']} faces detected!")

        return jsonify({
            'face_count': face_result['face_count'],
            'multiple_faces': face_result['multiple_faces'],
            'faces_detected': face_result['faces_detected'],
            'liveness_passed': liveness_result['passed'],
            'face_detected': liveness_result['face_detected'],
            'liveness_details': liveness_result.get('details', {})
        }), 200

    except Exception as e:
        print(f"\u274c Error in /monitor: {str(e)}")
        return jsonify({
            'error': str(e),
            'face_count': 0,
            'multiple_faces': False,
            'liveness_passed': False
        }), 500


########################################
# 5. VERIFY WITH REFERENCE PATH
########################################
@app.route('/verify-with-reference', methods=['POST'])
def verify_with_reference():
    """
    Verify a live image against a stored reference image path.
    Used by the Node backend for candidate verification.
    """
    try:
        ref_path = request.form.get('reference_path', '')
        rfid = request.form.get('rfid', '')
        roll_no = request.form.get('roll_no', '')

        if 'live_image' not in request.files:
            return jsonify({'error': 'Live image required'}), 400

        live_file = request.files['live_image']
        live_bytes = live_file.read()
        live_img = bytes_to_cv2(live_bytes)

        if live_img is None:
            return jsonify({'error': 'Invalid live image', 'match': False}), 400

        # Save temp live
        temp_live = os.path.join(tempfile.gettempdir(), f'live_{rfid}_{int(time.time())}.jpg')
        cv2.imwrite(temp_live, live_img)

        # Try multiple reference paths
        actual_ref_path = None
        search_paths = [
            ref_path,
            os.path.join(SCRIPT_DIR, '..', 'node-backend', ref_path),
            os.path.join(REFERENCE_DIR, f'{rfid}_reference.jpg'),
            os.path.join(SCRIPT_DIR, ref_path),
        ]

        for sp in search_paths:
            if sp and os.path.exists(sp):
                actual_ref_path = sp
                break

        if not actual_ref_path:
            # If no reference found, register the live image as reference
            ref_save_path = os.path.join(REFERENCE_DIR, f'{rfid}_reference.jpg')
            cv2.imwrite(ref_save_path, live_img)

            embedding = get_embedding(ref_save_path)
            if embedding is not None:
                active_sessions[rfid] = {
                    'embedding': embedding.tolist(),
                    'reference_path': ref_save_path,
                    'roll_no': roll_no,
                    'registered_at': datetime.now().isoformat(),
                    're_verify_count': 0,
                    're_verify_results': []
                }

            os.remove(temp_live)

            return jsonify({
                'match': True,
                'confidence': 100.0,
                'message': 'First verification — reference image saved',
                'first_time': True
            }), 200

        # Verify against reference
        match, score, details = verify_faces(actual_ref_path, temp_live)

        # Also register for re-verification
        ref_emb = get_embedding(actual_ref_path)
        if ref_emb is not None and rfid:
            active_sessions[rfid] = {
                'embedding': ref_emb.tolist(),
                'reference_path': actual_ref_path,
                'roll_no': roll_no,
                'registered_at': datetime.now().isoformat(),
                're_verify_count': 0,
                're_verify_results': []
            }

        os.remove(temp_live)

        confidence = round(float(score) * 100, 2)
        quality = check_face_quality(live_img)

        return jsonify({
            'match': bool(match),
            'confidence': confidence,
            'quality': quality,
            'verified': bool(match),
            'first_time': False
        }), 200

    except Exception as e:
        print(f"❌ Error in /verify-with-reference: {str(e)}")
        return jsonify({'error': str(e), 'match': False, 'confidence': 0}), 500


########################################
# 6. HEALTH CHECK
########################################
@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'OK',
        'service': 'NiyuktiSetu Face Verification API v2.0',
        'model': 'ArcFace',
        'detector': 'MTCNN',
        'liveness_engine': 'MediaPipe FaceMesh',
        'features': [
            'face_verification',
            'liveness_detection',
            'blink_detection',
            'head_pose_estimation',
            'motion_analysis',
            'face_quality_check',
            'anti_spoofing',
            'mid_interview_re_verification'
        ],
        'active_sessions': len(active_sessions),
        'endpoints': {
            'POST /verify': 'Compare two face images',
            'POST /register-reference': 'Store reference embedding',
            'POST /liveness-check': 'Verify liveness action',
            'POST /re-verify': 'Mid-interview re-verification',
            'POST /verify-with-reference': 'Verify live vs stored reference',
            'GET /health': 'This endpoint'
        }
    }), 200


########################################
# RUN
########################################
if __name__ == '__main__':
    print("\n" + "=" * 60)
    print("🔐 NiyuktiSetu Face Verification API v2.0")
    print("=" * 60)
    print("🧠 Model: ArcFace + MTCNN")
    print("👁️  Liveness: MediaPipe FaceMesh (blink + head pose)")
    print("🛡️  Anti-Spoofing: motion detection + re-verification")
    print("=" * 60)
    print("📍 POST http://localhost:5000/verify")
    print("📍 POST http://localhost:5000/register-reference")
    print("📍 POST http://localhost:5000/liveness-check")
    print("📍 POST http://localhost:5000/re-verify")
    print("📍 POST http://localhost:5000/verify-with-reference")
    print("📍 GET  http://localhost:5000/health")
    print("=" * 60 + "\n")

    app.run(host='0.0.0.0', port=5000, debug=True)
