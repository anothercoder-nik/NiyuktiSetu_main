import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Calendar,
  ArrowLeft,
  Download,
  Moon,
  Sun
} from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDark, setIsDark] = useState(true);
  
  // Get interview data from navigation state
  const interviewData = location.state || {
    candidateInfo: {
      name: 'Candidate Name',
      rollNo: 'N/A',
      rfid: 'N/A',
      dob: 'N/A',
      verified: true,
      language: 'English'
    },
    interviewSession: {
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      duration: 0,
      totalQuestions: 5,
      answeredQuestions: 0,
      status: 'Incomplete'
    },
    questionsAndAnswers: []
  };

  const { candidateInfo, interviewSession, questionsAndAnswers } = interviewData;

  useEffect(() => {
    // Set theme
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownloadReport = () => {
    // Create a text report
    let report = `NIYUKTISETU - NDA INTERVIEW REPORT\n`;
    report += `${'='.repeat(50)}\n\n`;
    report += `CANDIDATE INFORMATION:\n`;
    report += `Name: ${candidateInfo.name}\n`;
    report += `Roll Number: ${candidateInfo.rollNo}\n`;
    report += `RFID: ${candidateInfo.rfid}\n`;
    report += `Date of Birth: ${candidateInfo.dob}\n`;
    report += `Verification Status: ${candidateInfo.verified ? 'Verified ✓' : 'Not Verified ✗'}\n`;
    report += `Language: ${candidateInfo.language}\n\n`;
    
    report += `INTERVIEW SESSION:\n`;
    report += `Start Time: ${formatDateTime(interviewSession.startTime)}\n`;
    report += `End Time: ${formatDateTime(interviewSession.endTime)}\n`;
    report += `Duration: ${formatDuration(interviewSession.duration)}\n`;
    report += `Status: ${interviewSession.status}\n`;
    report += `Questions Answered: ${interviewSession.answeredQuestions}/${interviewSession.totalQuestions}\n\n`;
    
    report += `QUESTIONS & ANSWERS:\n`;
    report += `${'='.repeat(50)}\n`;
    questionsAndAnswers.forEach((qa, index) => {
      report += `\nQ${index + 1}. ${qa.question}\n`;
      report += `Answer: ${qa.answer || 'No answer provided'}\n`;
      report += `Status: ${qa.answered ? 'Answered ✓' : 'Not Answered ✗'}\n`;
      report += `${'-'.repeat(50)}\n`;
    });

    // Download as text file
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Interview_Report_${candidateInfo.rollNo}_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`dashboard-container ${isDark ? 'dark' : 'light'}`}>
      {/* Header */}
      <div className="dashboard-header">
        <button className="back-button" onClick={() => navigate('/')}>
          <ArrowLeft size={20} />
          <span>Back to Home</span>
        </button>
        <h1 className="dashboard-title">Interview Report</h1>
        <button className="theme-toggle" onClick={() => setIsDark(!isDark)}>
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      <div className="dashboard-content">
        {/* Candidate Info Card */}
        <div className="info-card">
          <div className="card-header">
            <User size={24} />
            <h2>Candidate Information</h2>
          </div>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Name:</span>
              <span className="info-value">{candidateInfo.name}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Roll Number:</span>
              <span className="info-value">{candidateInfo.rollNo}</span>
            </div>
            <div className="info-item">
              <span className="info-label">RFID:</span>
              <span className="info-value">{candidateInfo.rfid}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Date of Birth:</span>
              <span className="info-value">{candidateInfo.dob}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Verification:</span>
              <span className={`verification-badge ${candidateInfo.verified ? 'verified' : 'not-verified'}`}>
                {candidateInfo.verified ? (
                  <>
                    <CheckCircle size={16} />
                    Verified
                  </>
                ) : (
                  <>
                    <XCircle size={16} />
                    Not Verified
                  </>
                )}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Language:</span>
              <span className="info-value">{candidateInfo.language}</span>
            </div>
          </div>
        </div>

        {/* Session Info Card */}
        <div className="info-card">
          <div className="card-header">
            <Clock size={24} />
            <h2>Interview Session</h2>
          </div>
          <div className="session-stats">
            <div className="stat-item">
              <Calendar size={20} />
              <div className="stat-content">
                <span className="stat-label">Start Time</span>
                <span className="stat-value">{formatDateTime(interviewSession.startTime)}</span>
              </div>
            </div>
            <div className="stat-item">
              <Calendar size={20} />
              <div className="stat-content">
                <span className="stat-label">End Time</span>
                <span className="stat-value">{formatDateTime(interviewSession.endTime)}</span>
              </div>
            </div>
            <div className="stat-item">
              <Clock size={20} />
              <div className="stat-content">
                <span className="stat-label">Duration</span>
                <span className="stat-value">{formatDuration(interviewSession.duration)}</span>
              </div>
            </div>
            <div className="stat-item status-item">
              <div className="stat-content">
                <span className="stat-label">Status</span>
                <span className={`status-badge ${interviewSession.status.toLowerCase()}`}>
                  {interviewSession.status}
                </span>
              </div>
            </div>
          </div>

          <div className="progress-section">
            <h3>Questions Progress</h3>
            <div className="progress-bar-container">
              <div 
                className="progress-bar-fill"
                style={{ width: `${(interviewSession.answeredQuestions / interviewSession.totalQuestions) * 100}%` }}
              />
            </div>
            <div className="progress-text">
              {interviewSession.answeredQuestions} of {interviewSession.totalQuestions} questions answered
            </div>
          </div>
        </div>

        {/* Questions & Answers Table */}
        <div className="info-card qa-card">
          <div className="card-header">
            <h2>Questions & Answers</h2>
            <button className="download-button" onClick={handleDownloadReport}>
              <Download size={18} />
              Download Report
            </button>
          </div>

          {questionsAndAnswers.length > 0 ? (
            <div className="qa-table">
              {questionsAndAnswers.map((qa, index) => (
                <div key={index} className="qa-row">
                  <div className="qa-header">
                    <div className="qa-number">Q{index + 1}</div>
                    <div className={`qa-status ${qa.answered ? 'answered' : 'not-answered'}`}>
                      {qa.answered ? <CheckCircle size={16} /> : <XCircle size={16} />}
                      {qa.answered ? 'Answered' : 'Not Answered'}
                    </div>
                  </div>
                  <div className="qa-question">
                    <strong>Question:</strong> {qa.question}
                  </div>
                  <div className="qa-answer">
                    <strong>Answer:</strong> 
                    <p>{qa.answer || <em className="no-answer">No answer provided</em>}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">
              <p>No questions were answered during this session.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
