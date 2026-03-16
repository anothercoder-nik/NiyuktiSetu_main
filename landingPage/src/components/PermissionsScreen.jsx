import React, { useState } from 'react';
import { Mic, AlertCircle, CheckCircle } from 'lucide-react';
import './PermissionsScreen.css';

const PermissionsScreen = ({ onPermissionsGranted, onCancel, cameraStream }) => {
  const [audioPermission, setAudioPermission] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [proceeded, setProceeded] = useState(false);
  const [error, setError] = useState('');

  const requestPermissions = async () => {
    setIsRequesting(true);
    setError('');

    try {
      // Request only microphone access (camera already granted in face verification)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });

      // Permissions granted
      setAudioPermission(true);

      // Stop the stream (we'll request it again when needed)
      stream.getTracks().forEach(track => track.stop());

      // Wait a moment to show success state then proceed
      setProceeded(true);
      setTimeout(() => {
        onPermissionsGranted();
      }, 1000);
    } catch (err) {
      console.error('Permission error:', err);
      setError('Unable to access microphone. Please grant permission to continue.');
    } finally {
      setIsRequesting(false);
    }
  };

  const toggleAudio = async () => {
    if (!audioPermission) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setAudioPermission(true);
        stream.getTracks().forEach(track => track.stop());

        // Auto-proceed after granting mic via toggle
        setProceeded(true);
        setTimeout(() => {
          onPermissionsGranted();
        }, 1000);
      } catch (err) {
        setError('Microphone permission denied');
      }
    } else {
      setAudioPermission(false);
    }
  };

  return (
    <div className="permissions-container">
      <div className="permissions-content">
        <h1 className="permissions-title">Security Permission</h1>

        {error && (
          <div className="permissions-error">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <div className="permissions-card">
          <div className="permission-item">
            <div className="permission-info">
              <div className="permission-icon-wrapper camera-icon">
                <CheckCircle size={24} className="granted-icon" />
              </div>
              <span className="permission-label">Camera (Already Granted)</span>
            </div>
            <div className="granted-badge">✓</div>
          </div>

          <div className="permission-item">
            <div className="permission-info">
              <div className="permission-icon-wrapper audio-icon">
                <Mic size={24} />
              </div>
              <span className="permission-label">Microphone</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={audioPermission}
                onChange={toggleAudio}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <button
          onClick={requestPermissions}
          disabled={isRequesting || proceeded}
          className="proceed-button"
        >
          {isRequesting ? 'Requesting...' : proceeded ? 'Permission Granted ✓' : 'PROCEED'}
        </button>
      </div>
    </div>
  );
};

export default PermissionsScreen;
