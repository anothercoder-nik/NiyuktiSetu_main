from flask import Flask, request, jsonify
from flask_cors import CORS
import tempfile
import os
from face_service import verify_faces

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/verify', methods=['POST'])
def verify():
    """
    Endpoint to verify two face images
    Expects two images: image1 (reference) and image2 (live)
    Returns: {match: bool, confidence: float}
    """
    try:
        # Check if both images are present
        if 'image1' not in request.files or 'image2' not in request.files:
            return jsonify({
                'error': 'Both image1 (reference) and image2 (live) are required'
            }), 400

        image1 = request.files['image1']
        image2 = request.files['image2']

        # Save images temporarily
        temp_dir = tempfile.gettempdir()
        
        ref_path = os.path.join(temp_dir, 'temp_ref.jpg')
        live_path = os.path.join(temp_dir, 'temp_live.jpg')
        
        image1.save(ref_path)
        image2.save(live_path)

        print(f"Processing reference image: {ref_path}")
        print(f"Processing live image: {live_path}")

        # Verify faces using face_service
        match, score = verify_faces(ref_path, live_path)
        
        # Convert to native Python types (not numpy types)
        match = bool(match)
        score = float(score)
        
        # Convert score to percentage
        confidence = round(score * 100, 2)
        
        print(f"Similarity score: {score:.4f} ({confidence}%)")
        print(f"Match: {match}")

        # Clean up temporary files
        try:
            os.remove(ref_path)
            os.remove(live_path)
        except:
            pass

        return jsonify({
            'match': match,
            'confidence': confidence
        }), 200

    except Exception as e:
        print(f"Error in verify endpoint: {str(e)}")
        return jsonify({
            'error': str(e),
            'match': False,
            'confidence': 0
        }), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'OK',
        'service': 'Face Verification API',
        'model': 'ArcFace',
        'detector': 'mtcnn'
    }), 200

if __name__ == '__main__':
    print("🚀 Starting Face Verification API on port 5000")
    print("📍 Endpoint: POST http://localhost:5000/verify")
    print("📍 Health: GET http://localhost:5000/health")
    app.run(host='0.0.0.0', port=5000, debug=True)
