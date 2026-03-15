import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import InputField from '../components/InputField';
import SubmitButton from '../components/SubmitButton';
import FaceVerification from '../components/FaceVerification';
import PermissionsScreen from '../components/PermissionsScreen';
import LanguageSelection from '../components/LanguageSelection';
import InterviewSession from '../components/InterviewSession';
import { apiService } from '../services/api';
import '../utils/login.css';

const LoginForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    rollNo: '',
    dob: '',
    rfid: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [currentStep, setCurrentStep] = useState('login'); // login, faceVerification, permissions, language, interview
  const [userImage, setUserImage] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState(null);

  const [candidateData, setCandidateData] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.rollNo || !formData.dob || !formData.rfid) {
      setError('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiService.interviewLogin({
        roll_no: formData.rollNo,
        dob: formData.dob,
        rfid: formData.rfid
      });

      if (response.verified) {
        setSessionId(response.candidate?.id || 'session-' + Date.now());
        // Store full candidate data from API response
        setCandidateData({
          name: response.candidate?.name || 'Candidate',
          rollNo: formData.rollNo,
          rfid: formData.rfid,
          dob: formData.dob,
          roll_no: response.candidate?.roll_no || formData.rollNo
        });
        setCurrentStep('faceVerification');
      } else {
        setError(response.message || 'Login failed. Please check your details.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid credentials. Please check your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerificationSuccess = (result) => {
    console.log('Face verified:', result);
    // Store user image from verification if available
    // Move to permissions screen
    setCurrentStep('permissions');
  };

  const handleVerificationCancel = () => {
    setCurrentStep('login');
    setSessionId(null);
  };

  const handlePermissionsGranted = () => {
    // Move to language selection
    setCurrentStep('language');
  };

  const handleLanguageSelect = (language) => {
    setSelectedLanguage(language);
    // Start interview session
    setCurrentStep('interview');
  };

  const handleInterviewComplete = () => {
    // Redirect to landing page
    navigate('/');
  };

  // Render based on current step
  if (currentStep === 'interview') {
    return (
      <InterviewSession
        sessionId={sessionId}
        language={selectedLanguage}
        onComplete={handleInterviewComplete}
        userImage={userImage}
        candidateInfo={candidateData || formData}
      />
    );
  }

  if (currentStep === 'language') {
    return (
      <LanguageSelection
        onLanguageSelect={handleLanguageSelect}
        userImage={userImage}
      />
    );
  }

  if (currentStep === 'permissions') {
    return (
      <PermissionsScreen
        onPermissionsGranted={handlePermissionsGranted}
        onCancel={() => setCurrentStep('login')}
      />
    );
  }

  if (currentStep === 'faceVerification') {
    return (
      <FaceVerification
        sessionId={sessionId}
        rollNo={candidateData?.rollNo || formData.rollNo}
        rfid={candidateData?.rfid || formData.rfid}
        onVerificationSuccess={handleVerificationSuccess}
        onCancel={handleVerificationCancel}
      />
    );
  }

  // Default login form
  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">ACCESS TO INTERVIEW</h1>
        {error && (
          <div className="login-error">
            {error}
          </div>
        )}
        <form className="login-form" onSubmit={handleSubmit}>
          <InputField
            label="Roll No."
            type="text"
            placeholder="Roll Number"
            name="rollNo"
            value={formData.rollNo}
            onChange={handleInputChange}
            icon="a"
          />
          <InputField
            label="Date Of Birth"
            type="text"
            placeholder="dd/mm/yyyy"
            name="dob"
            value={formData.dob}
            onChange={handleInputChange}
            icon="a"
          />
          <InputField
            label="RFID"
            type="password"
            placeholder="RFID"
            name="rfid"
            value={formData.rfid}
            onChange={handleInputChange}
            icon="◉"
          />
          <SubmitButton disabled={isSubmitting} />
        </form>
      </div>
    </div>
  );
};

export default LoginForm;