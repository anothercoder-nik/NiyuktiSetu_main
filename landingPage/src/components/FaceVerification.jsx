import React, { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle, XCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { apiService, isDemoMode } from '../services/api';
import './FaceVerification.css';

const FaceVerification = ({ sessionId, rollNo, rfid, onVerificationSuccess, onCancel }) => {
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please ensure camera permissions are granted.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      const imageUrl = URL.createObjectURL(blob);
      setCapturedImage({ blob, url: imageUrl });
      stopCamera();
    }, 'image/jpeg', 0.95);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setVerificationResult(null);
    setError(null);
    startCamera();
  };

  const verifyFace = async () => {
    if (!capturedImage) return;

    setIsVerifying(true);
    setError(null);

    try {
      // Call verifyLiveFace with roll_no and rfid
      const result = await apiService.verifyLiveFace(capturedImage.blob, rollNo, rfid);
      
      setVerificationResult(result);
      
      if (result.verified) {
        // Wait 2 seconds to show success message, then proceed
        setTimeout(() => {
          onVerificationSuccess(result);
        }, 2000);
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError('Face verification failed. Please try again.');
      setVerificationResult({ verified: false, message: 'Verification error occurred' });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="face-verification-container">
      <div className="verification-modal">
        <div className="verification-header">
          <h2 className="verification-title">Face Verification</h2>
          <p className="verification-subtitle">
            Please position your face clearly in the frame
          </p>
          {isDemoMode() && (
            <div className="demo-badge">
              <AlertCircle size={16} />
              DEMO MODE
            </div>
          )}
        </div>

        <div className="camera-section">
          {!capturedImage ? (
            <div className="video-wrapper">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="video-preview"
              />
              <div className="face-guide-overlay">
                <div className="face-guide-circle"></div>
              </div>
            </div>
          ) : (
            <div className="captured-image-wrapper">
              <img src={capturedImage.url} alt="Captured" className="captured-image" />
            </div>
          )}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        {error && (
          <div className="error-message">
            <XCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {verificationResult && (
          <div className={`verification-result ${verificationResult.verified ? 'success' : 'failure'}`}>
            {verificationResult.verified ? (
              <>
                <CheckCircle size={32} />
                <span className="result-text">Face Verified Successfully!</span>
                {verificationResult.confidence && (
                  <span className="confidence-text">
                    Confidence: {(verificationResult.confidence * 100).toFixed(1)}%
                  </span>
                )}
              </>
            ) : (
              <>
                <XCircle size={32} />
                <span className="result-text">Verification Failed</span>
                <span className="result-subtext">Please retake the photo</span>
              </>
            )}
          </div>
        )}

        <div className="verification-actions">
          {!capturedImage ? (
            <>
              <button
                onClick={captureImage}
                disabled={!stream || error}
                className="btn-capture"
              >
                <Camera size={20} />
                Capture Photo
              </button>
              <button onClick={onCancel} className="btn-cancel">
                Cancel
              </button>
            </>
          ) : (
            <>
              {!verificationResult && (
                <>
                  <button
                    onClick={verifyFace}
                    disabled={isVerifying}
                    className="btn-verify"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw size={20} className="spinning" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={20} />
                        Verify Face
                      </>
                    )}
                  </button>
                  <button onClick={retakePhoto} className="btn-retake">
                    <RefreshCw size={20} />
                    Retake Photo
                  </button>
                </>
              )}
              {verificationResult && !verificationResult.verified && (
                <button onClick={retakePhoto} className="btn-retry">
                  <RefreshCw size={20} />
                  Try Again
                </button>
              )}
            </>
          )}
        </div>

        <div className="verification-tips">
          <h4>Tips for best results:</h4>
          <ul>
            <li>Ensure your face is well-lit</li>
            <li>Look directly at the camera</li>
            <li>Remove glasses or mask if possible</li>
            <li>Keep a neutral expression</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FaceVerification;
