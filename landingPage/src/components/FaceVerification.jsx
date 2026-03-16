import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, CheckCircle, XCircle, RefreshCw, AlertCircle, Eye, Move, Shield } from 'lucide-react';
import { apiService, isDemoMode } from '../services/api';
import './FaceVerification.css';

const LIVENESS_ACTIONS = [
  { action: 'face_present', label: 'Position your face in the frame', icon: '🎯' },
  { action: 'blink', label: 'Please blink your eyes naturally', icon: '👁️' },
  { action: 'turn_left', label: 'Slowly turn your head to the LEFT', icon: '⬅️' },
  { action: 'turn_right', label: 'Slowly turn your head to the RIGHT', icon: '➡️' },
];

const FaceVerification = ({ sessionId, rollNo, rfid, onVerificationSuccess, onCancel }) => {
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [error, setError] = useState(null);

  // Liveness state
  const [step, setStep] = useState('capture'); // capture, liveness, verifying, result
  const [livenessIndex, setLivenessIndex] = useState(0);
  const [livenessResults, setLivenessResults] = useState([]);
  const [livenessStatus, setLivenessStatus] = useState(''); // checking, passed, failed
  const [attemptCount, setAttemptCount] = useState(0);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const livenessIntervalRef = useRef(null);

  // Enter fullscreen on mount (security lockdown starts at verification)
  useEffect(() => {
    const enterFullscreen = () => {
      const el = document.documentElement;
      const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
      if (rfs) {
        rfs.call(el).catch(err => console.warn('Fullscreen request denied:', err));
      }
    };
    enterFullscreen();
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (livenessIntervalRef.current) clearInterval(livenessIntervalRef.current);
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

  const captureFrame = useCallback(() => {
    return new Promise((resolve) => {
      if (!videoRef.current || !canvasRef.current) {
        resolve(null);
        return;
      }
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.90);
    });
  }, []);

  // Step 1: Capture reference photo
  const captureReferencePhoto = async () => {
    const blob = await captureFrame();
    if (!blob) return;
    const imageUrl = URL.createObjectURL(blob);
    setCapturedImage({ blob, url: imageUrl });
    setStep('liveness');
    setLivenessIndex(0);
    setLivenessResults([]);
  };

  // Step 2: Run liveness checks
  const runLivenessCheck = async () => {
    if (livenessIndex >= LIVENESS_ACTIONS.length) return;

    const currentAction = LIVENESS_ACTIONS[livenessIndex];
    setLivenessStatus('checking');
    setAttemptCount(0);

    // Try up to 8 frames over ~4 seconds
    let passed = false;
    for (let i = 0; i < 8; i++) {
      setAttemptCount(i + 1);
      const frameBlob = await captureFrame();
      if (!frameBlob) continue;

      try {
        const result = await apiService.livenessCheck(frameBlob, currentAction.action);
        if (result.passed) {
          passed = true;
          break;
        }
      } catch (err) {
        console.error('Liveness check error:', err);
      }

      // Wait 500ms between frames
      await new Promise(r => setTimeout(r, 500));
    }

    const newResults = [...livenessResults, { action: currentAction.action, passed }];
    setLivenessResults(newResults);

    if (passed) {
      setLivenessStatus('passed');
      // Move to next action after a brief delay
      setTimeout(() => {
        if (livenessIndex + 1 < LIVENESS_ACTIONS.length) {
          setLivenessIndex(livenessIndex + 1);
          setLivenessStatus('');
        } else {
          // All checks passed — proceed to face verification
          setStep('verifying');
          performFaceVerification();
        }
      }, 800);
    } else {
      setLivenessStatus('failed');
    }
  };

  // Start liveness check when step changes to liveness
  useEffect(() => {
    if (step === 'liveness' && livenessStatus === '') {
      // Small delay so user can read the instruction
      const timer = setTimeout(() => runLivenessCheck(), 1500);
      return () => clearTimeout(timer);
    }
  }, [step, livenessIndex, livenessStatus]);

  // Step 3: Face verification against reference
  const performFaceVerification = async () => {
    if (!capturedImage) return;
    setIsVerifying(true);
    setError(null);

    try {
      const result = await apiService.verifyLiveFace(capturedImage.blob, rollNo, rfid);

      // Also register reference for mid-interview re-verification
      try {
        await apiService.registerReference(capturedImage.blob, rfid, rollNo);
      } catch (regErr) {
        console.warn('Reference registration warning:', regErr);
      }

      setVerificationResult(result);
      setStep('result');

      if (result.verified || result.match) {
        setTimeout(() => {
          onVerificationSuccess(result);
        }, 2000);
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError('Face verification failed. Please try again.');
      setVerificationResult({ verified: false, message: 'Verification error' });
      setStep('result');
    } finally {
      setIsVerifying(false);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setVerificationResult(null);
    setError(null);
    setStep('capture');
    setLivenessIndex(0);
    setLivenessResults([]);
    setLivenessStatus('');
    startCamera();
  };

  const retryLiveness = () => {
    setLivenessStatus('');
    // This will trigger the useEffect to restart current check
  };

  return (
    <div className="face-verification-container">
      <div className="verification-modal">
        <div className="verification-header">
          <h2 className="verification-title">
            <Shield size={24} style={{ marginRight: 8 }} />
            Identity Verification
          </h2>
          <p className="verification-subtitle">
            {step === 'capture' && 'Step 1: Capture your reference photo'}
            {step === 'liveness' && `Step 2: Liveness Check (${livenessIndex + 1}/${LIVENESS_ACTIONS.length})`}
            {step === 'verifying' && 'Step 3: Verifying identity...'}
            {step === 'result' && 'Verification Complete'}
          </p>

          {/* Progress bar */}
          <div style={{
            display: 'flex', gap: 4, marginTop: 8, justifyContent: 'center'
          }}>
            {['capture', 'liveness', 'verifying', 'result'].map((s, i) => (
              <div key={s} style={{
                width: 60, height: 4, borderRadius: 2,
                backgroundColor: ['capture', 'liveness', 'verifying', 'result'].indexOf(step) >= i
                  ? '#10b981' : '#374151'
              }} />
            ))}
          </div>
        </div>

        <div className="camera-section">
          {step !== 'result' ? (
            <div className="video-wrapper">
              <video ref={videoRef} autoPlay playsInline className="video-preview" />
              <div className="face-guide-overlay">
                <div className="face-guide-circle"></div>
              </div>

              {/* Liveness instruction overlay */}
              {step === 'liveness' && livenessIndex < LIVENESS_ACTIONS.length && (
                <div style={{
                  position: 'absolute', bottom: 10, left: 0, right: 0,
                  textAlign: 'center', padding: '12px 16px',
                  background: 'rgba(0,0,0,0.8)', borderRadius: 8,
                  margin: '0 16px', color: '#fff'
                }}>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>
                    {LIVENESS_ACTIONS[livenessIndex].icon}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {LIVENESS_ACTIONS[livenessIndex].label}
                  </div>
                  {livenessStatus === 'checking' && (
                    <div style={{ fontSize: 12, color: '#fbbf24', marginTop: 4 }}>
                      Checking... ({attemptCount}/8)
                    </div>
                  )}
                  {livenessStatus === 'passed' && (
                    <div style={{ fontSize: 12, color: '#10b981', marginTop: 4 }}>
                      ✅ Passed!
                    </div>
                  )}
                  {livenessStatus === 'failed' && (
                    <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
                      ❌ Failed — please try again
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="captured-image-wrapper">
              <img src={capturedImage?.url} alt="Captured" className="captured-image" />
            </div>
          )}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        {/* Liveness results summary */}
        {livenessResults.length > 0 && step !== 'capture' && (
          <div style={{
            display: 'flex', gap: 8, justifyContent: 'center',
            padding: '8px 0', flexWrap: 'wrap'
          }}>
            {livenessResults.map((r, i) => (
              <div key={i} style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12,
                background: r.passed ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                color: r.passed ? '#10b981' : '#ef4444',
                border: `1px solid ${r.passed ? '#10b981' : '#ef4444'}`
              }}>
                {r.passed ? '✅' : '❌'} {r.action.replace('_', ' ')}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="error-message">
            <XCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {verificationResult && step === 'result' && (
          <div className={`verification-result ${verificationResult.verified || verificationResult.match ? 'success' : 'failure'}`}>
            {verificationResult.verified || verificationResult.match ? (
              <>
                <CheckCircle size={32} />
                <span className="result-text">Identity Verified Successfully!</span>
                {verificationResult.confidence && (
                  <span className="confidence-text">
                    Confidence: {verificationResult.confidence > 1
                      ? verificationResult.confidence.toFixed(1)
                      : (verificationResult.confidence * 100).toFixed(1)}%
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
          {step === 'capture' && (
            <>
              <button onClick={captureReferencePhoto} disabled={!stream || error} className="btn-capture">
                <Camera size={20} />
                Capture Photo
              </button>
              <button onClick={onCancel} className="btn-cancel">Cancel</button>
            </>
          )}

          {step === 'liveness' && livenessStatus === 'failed' && (
            <button onClick={retryLiveness} className="btn-retry">
              <RefreshCw size={20} />
              Retry Check
            </button>
          )}

          {step === 'verifying' && (
            <div style={{ textAlign: 'center', padding: 16, color: '#9ca3af' }}>
              <RefreshCw size={24} className="spinning" />
              <p style={{ marginTop: 8 }}>Verifying your identity...</p>
            </div>
          )}

          {step === 'result' && verificationResult && !(verificationResult.verified || verificationResult.match) && (
            <button onClick={retakePhoto} className="btn-retry">
              <RefreshCw size={20} />
              Try Again
            </button>
          )}
        </div>

        <div className="verification-tips">
          <h4>🛡️ Anti-Spoofing Security Checks:</h4>
          <ul>
            <li>Face presence detection</li>
            <li>Eye blink verification</li>
            <li>Head movement tracking (left/right)</li>
            <li>AI-powered face matching</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FaceVerification;
