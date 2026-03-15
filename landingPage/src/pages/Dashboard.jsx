import React, { useState, useEffect, useMemo } from 'react';
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
  Sun,
  LogOut,
  X,
  FileText,
  BarChart3,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MagicCard } from '../components/magicui/magic-card';
import { Meteors } from '../components/magicui/meteors';
import { BorderBeam } from '../components/magicui/border-beam';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [isDark, setIsDark] = useState(true);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    // Set theme
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const { apiService } = await import('../services/api');
        const response = await apiService.getUserReports();

        if (response.success && response.reports && response.reports.length > 0) {
          setReports(response.reports);
          // If we just finished an interview (have location state), we could open it automatically.
          if (location.state && location.state.interviewSession?.sessionId) {
            const current = response.reports.find(r => r.interviewSession?.sessionId === location.state.interviewSession.sessionId);
            if (current) setSelectedReport(current);
          }
        } else {
          setError("No interview reports found.");
        }
      } catch (err) {
        console.error("Failed to fetch reports:", err);
        setError("Failed to load interview reports.");
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [location.state]);


  const formatDuration = (seconds) => {
    if (!seconds) return '0m 0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const stats = useMemo(() => {
    const totalInterviews = reports.length;
    const totalAnswered = reports.reduce((sum, r) => sum + (r.interviewSession?.answeredQuestions || 0), 0);
    const lastSession = reports.length > 0
      ? formatDateTime(
        reports.reduce((latest, r) => {
          const t = new Date(r.interviewSession?.startTime || 0).getTime();
          return t > latest ? t : latest;
        }, 0) > 0
          ? new Date(
            reports.reduce((latest, r) => {
              const t = new Date(r.interviewSession?.startTime || 0).getTime();
              return t > latest ? t : latest;
            }, 0)
          ).toISOString()
          : null
      )
      : 'N/A';
    return { totalInterviews, totalAnswered, lastSession };
  }, [reports]);

  const handleDownloadReport = (reportData) => {
    if (!reportData) return;
    const { candidateInfo, interviewSession, questionsAndAnswers } = reportData;

    const reportDate = new Date().toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    const qaRows = (questionsAndAnswers || []).map((qa, i) => `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151;width:50px;text-align:center;">Q${i + 1}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">
          <div style="font-weight:600;color:#1f2937;margin-bottom:6px;">${qa.question || 'N/A'}</div>
          ${qa.category ? `<span style="font-size:11px;padding:2px 8px;border-radius:10px;background:#eff6ff;color:#3b82f6;">${qa.category}</span>` : ''}
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#4b5563;">
          ${qa.answer || '<em style="color:#9ca3af;">No answer provided</em>'}
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;text-align:center;">
          <span style="padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;${qa.answered ? 'background:#d1fae5;color:#059669;' : 'background:#fee2e2;color:#dc2626;'}">
            ${qa.answered ? '✓ Answered' : '✗ Skipped'}
          </span>
        </td>
      </tr>
    `).join('');

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>NiyuktiSetu Interview Report - ${candidateInfo?.name || 'Candidate'}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #fff; color: #1f2937; padding: 40px; }
        .header { text-align: center; padding-bottom: 24px; border-bottom: 3px solid #FF9933; margin-bottom: 32px; }
        .logo-row { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 8px; }
        .logo-text { font-size: 28px; font-weight: 800; color: #1f2937; }
        .logo-accent { color: #FF9933; }
        .subtitle { font-size: 13px; color: #6b7280; letter-spacing: 2px; text-transform: uppercase; }
        .badge { display: inline-block; margin-top: 8px; padding: 4px 16px; background: linear-gradient(135deg, #FF9933, #138808); color: #fff; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 1px; }
        .section { margin-bottom: 28px; }
        .section-title { font-size: 16px; font-weight: 700; color: #FF9933; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #f3f4f6; display: flex; align-items: center; gap: 8px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; }
        .info-item { display: flex; gap: 8px; font-size: 13px; }
        .info-label { font-weight: 600; color: #6b7280; min-width: 120px; }
        .info-value { color: #1f2937; font-weight: 500; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background: #f9fafb; padding: 10px 16px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #f3f4f6; text-align: center; color: #9ca3af; font-size: 11px; }
        .confidential { background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 12px 20px; text-align: center; margin-top: 16px; }
        .confidential-text { font-size: 12px; font-weight: 600; color: #92400e; }
        @media print {
          body { padding: 20px; }
          @page { margin: 15mm; size: A4; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-row">
          <span class="logo-text">Niyukti<span class="logo-accent">Setu</span></span>
        </div>
        <div class="subtitle">Government of India — Interview Assessment Platform</div>
        <div class="badge">OFFICIAL INTERVIEW REPORT</div>
      </div>

      <div class="section">
        <div class="section-title">📋 Candidate Information</div>
        <div class="info-grid">
          <div class="info-item"><span class="info-label">Full Name:</span><span class="info-value">${candidateInfo?.name || 'N/A'}</span></div>
          <div class="info-item"><span class="info-label">Roll Number:</span><span class="info-value">${candidateInfo?.rollNo || 'N/A'}</span></div>
          <div class="info-item"><span class="info-label">RFID:</span><span class="info-value">${candidateInfo?.rfid || 'N/A'}</span></div>
          <div class="info-item"><span class="info-label">Date of Birth:</span><span class="info-value">${candidateInfo?.dob || 'N/A'}</span></div>
          <div class="info-item"><span class="info-label">Verification:</span><span class="info-value">${candidateInfo?.verified ? '✓ Identity Verified' : '✗ Not Verified'}</span></div>
          <div class="info-item"><span class="info-label">Language:</span><span class="info-value">${candidateInfo?.language || 'English'}</span></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">🕐 Session Details</div>
        <div class="info-grid">
          <div class="info-item"><span class="info-label">Start Time:</span><span class="info-value">${formatDateTime(interviewSession?.startTime)}</span></div>
          <div class="info-item"><span class="info-label">End Time:</span><span class="info-value">${formatDateTime(interviewSession?.endTime)}</span></div>
          <div class="info-item"><span class="info-label">Duration:</span><span class="info-value">${formatDuration(interviewSession?.duration || 0)}</span></div>
          <div class="info-item"><span class="info-label">Status:</span><span class="info-value">${interviewSession?.status || 'N/A'}</span></div>
          <div class="info-item"><span class="info-label">Questions Attempted:</span><span class="info-value">${interviewSession?.answeredQuestions || 0} of ${interviewSession?.totalQuestions || 0}</span></div>
          <div class="info-item"><span class="info-label">Re-Verifications:</span><span class="info-value">${interviewSession?.reVerificationCount || 0}</span></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">📝 Interview Questions & Responses</div>
        <table>
          <thead>
            <tr>
              <th style="width:50px;text-align:center;">#</th>
              <th>Question</th>
              <th>Candidate Response</th>
              <th style="width:100px;text-align:center;">Status</th>
            </tr>
          </thead>
          <tbody>${qaRows}</tbody>
        </table>
      </div>

      <div class="confidential">
        <div class="confidential-text">⚠️ CONFIDENTIAL — Scores and evaluations are securely stored in the NiyuktiSetu database and are accessible only by authorized government personnel. This report is for candidate reference only.</div>
      </div>

      <div class="footer">
        <p>Report generated on ${reportDate} | NiyuktiSetu — Government of India</p>
        <p style="margin-top:4px;">This is an electronically generated document. No signature is required.</p>
      </div>
    </body>
    </html>`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  if (loading) {
    return (
      <div className={`dashboard-container ${isDark ? 'dark' : 'light'}`}>
        <div className="dashboard-header">
          <div style={{ width: 140, height: 40, borderRadius: 50, background: 'rgba(255,255,255,0.04)' }} />
          <h1 className="dashboard-title">My Interviews</h1>
          <div style={{ width: 100, height: 40 }} />
        </div>
        <div className="skeleton-stats">
          {[1, 2, 3].map(i => <div key={i} className="skeleton-stat" />)}
        </div>
        <div className="skeleton-grid">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-line h-8 w-60" />
              <div className="skeleton-line w-80" />
              <div className="skeleton-line w-40" />
              <div className="skeleton-line w-50" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`dashboard-container ${isDark ? 'dark' : 'light'} relative overflow-hidden flex flex-col`}>
      {isDark && <Meteors number={30} />}

      {/* Header */}
      <div className="dashboard-header">
        <button className="back-button" onClick={() => navigate('/')}>
          <ArrowLeft size={20} />
          <span>Back to Home</span>
        </button>
        <h1 className="dashboard-title">My Interviews</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="theme-toggle" onClick={() => setIsDark(!isDark)}>
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            className="back-button"
            onClick={() => { logout(); navigate('/sign-in'); }}
            style={{ background: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)', color: '#f87171' }}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Stats Section */}
      {reports.length > 0 && (
        <div className="stats-section">
          <div className="stat-card">
            <div className="stat-card-icon interviews">
              <BarChart3 size={26} />
            </div>
            <div className="stat-card-info">
              <span className="stat-card-label">Total Interviews</span>
              <span className="stat-card-value">{stats.totalInterviews}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon questions">
              <HelpCircle size={26} />
            </div>
            <div className="stat-card-info">
              <span className="stat-card-label">Questions Answered</span>
              <span className="stat-card-value">{stats.totalAnswered}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon recent">
              <Calendar size={26} />
            </div>
            <div className="stat-card-info">
              <span className="stat-card-label">Last Session</span>
              <span className="stat-card-value text-sm">{stats.lastSession}</span>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-content">
        {reports.length === 0 ? (
          <div className="no-reports-card">
            <FileText size={52} color="#475569" />
            <h2>{error || "No interviews found"}</h2>
            <p>You haven't attempted any interviews yet.</p>
          </div>
        ) : (
          <div className="interview-cards-grid">
            {reports.map((report, idx) => (
              <MagicCard
                key={report.interviewSession?.sessionId || idx}
                className="interview-card"
                onClick={() => setSelectedReport(report)}
                gradientColor={isDark ? "rgba(255, 153, 51, 0.15)" : "rgba(255, 153, 51, 0.08)"}
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <div className="card-header">
                  <div className="card-icon">
                    <CheckCircle size={24} />
                  </div>
                  <div className={`status-badge ${(report.interviewSession?.status || 'Unknown').toLowerCase()}`}>
                    {report.interviewSession?.status || 'Unknown'}
                  </div>
                </div>
                <div className="card-body">
                  <h3 className="card-title">{report.candidateInfo?.name || 'Interview Session'}</h3>
                  <div className="card-subtitle">Interview Session</div>
                  <div className="card-details-row">
                    <div className="card-detail">
                      <Calendar size={14} />
                      <span>{formatDateTime(report.interviewSession?.startTime)}</span>
                    </div>
                    <div className="card-detail">
                      <Clock size={14} />
                      <span>{formatDuration(report.interviewSession?.duration)}</span>
                    </div>
                  </div>
                  <div className="card-detail">
                    <FileText size={14} />
                    <span>{report.interviewSession?.answeredQuestions || 0} / {report.interviewSession?.totalQuestions || 0} Questions</span>
                  </div>
                </div>
                <div className="card-footer">
                  View Details →
                </div>
              </MagicCard>
            ))}
          </div>
        )}
      </div>

      {/* Modal for Report Details */}
      {selectedReport && (
        <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="modal-content overflow-hidden relative" onClick={e => e.stopPropagation()}>
            <BorderBeam size={250} duration={12} delay={9} />
            <button className="modal-close" onClick={() => setSelectedReport(null)}>
              <X size={24} />
            </button>
            <div className="modal-body dashboard-content">
              {/* Candidate Info Card */}
              <div className="info-card modal-card">
                <div className="card-header-inner">
                  <User size={24} />
                  <h2>Candidate Information</h2>
                </div>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Name:</span>
                    <span className="info-value">{selectedReport.candidateInfo?.name || 'Unknown'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Roll Number:</span>
                    <span className="info-value">{selectedReport.candidateInfo?.rollNo || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">RFID:</span>
                    <span className="info-value">{selectedReport.candidateInfo?.rfid || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Date of Birth:</span>
                    <span className="info-value">{selectedReport.candidateInfo?.dob || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Verification:</span>
                    <span className={`verification-badge ${selectedReport.candidateInfo?.verified ? 'verified' : 'not-verified'}`}>
                      {selectedReport.candidateInfo?.verified ? (
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
                    <span className="info-value">{selectedReport.candidateInfo?.language || 'Unknown'}</span>
                  </div>
                </div>
              </div>

              {/* Session Info Card */}
              <div className="info-card modal-card">
                <div className="card-header-inner">
                  <Clock size={24} />
                  <h2>Interview Session Details</h2>
                </div>
                <div className="session-stats">
                  <div className="stat-item">
                    <Calendar size={20} />
                    <div className="stat-content">
                      <span className="stat-label">Start Time</span>
                      <span className="stat-value">{formatDateTime(selectedReport.interviewSession?.startTime)}</span>
                    </div>
                  </div>
                  <div className="stat-item">
                    <Calendar size={20} />
                    <div className="stat-content">
                      <span className="stat-label">End Time</span>
                      <span className="stat-value">{formatDateTime(selectedReport.interviewSession?.endTime)}</span>
                    </div>
                  </div>
                  <div className="stat-item">
                    <Clock size={20} />
                    <div className="stat-content">
                      <span className="stat-label">Duration</span>
                      <span className="stat-value">{formatDuration(selectedReport.interviewSession?.duration || 0)}</span>
                    </div>
                  </div>
                  <div className="stat-item status-item">
                    <div className="stat-content">
                      <span className="stat-label">Status</span>
                      <span className={`status-badge ${(selectedReport.interviewSession?.status || 'Unknown').toLowerCase()}`}>
                        {selectedReport.interviewSession?.status || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="progress-section">
                  <h3>Questions Progress</h3>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${(selectedReport.interviewSession?.answeredQuestions / (selectedReport.interviewSession?.totalQuestions || 1)) * 100}%` }}
                    />
                  </div>
                  <div className="progress-text">
                    {selectedReport.interviewSession?.answeredQuestions || 0} of {selectedReport.interviewSession?.totalQuestions || 0} questions answered
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
                    {(selectedReport.interviewSession?.reVerificationCount || 0) > 0 && (
                      <div style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>🛡️ Re-verifications</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#c084fc' }}>{selectedReport.interviewSession?.reVerificationCount}</div>
                      </div>
                    )}
                    <div style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(255,153,51,0.1)', border: '1px solid rgba(255,153,51,0.2)' }}>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>🔒 Scores</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#FF9933' }}>Confidential</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Questions & Answers Table */}
              <div className="info-card qa-card modal-card">
                <div className="card-header-inner qa-card-header">
                  <h2>Questions & Answers</h2>
                  <button className="download-button" onClick={() => handleDownloadReport(selectedReport)}>
                    <Download size={18} />
                    Download PDF
                  </button>
                </div>

                {selectedReport.questionsAndAnswers?.length > 0 ? (
                  <div className="qa-table">
                    {selectedReport.questionsAndAnswers.map((qa, index) => (
                      <div key={index} className="qa-row">
                        <div className="qa-header">
                          <div className="qa-number">Q{index + 1}</div>
                          {qa.category && (
                            <span style={{ fontSize: 12, color: '#60a5fa', marginLeft: 8 }}>{qa.category}</span>
                          )}
                          {qa.difficulty && (
                            <span style={{
                              fontSize: 10, padding: '2px 8px', borderRadius: 10, marginLeft: 6,
                              fontWeight: 700, textTransform: 'uppercase',
                              background: qa.difficulty === 'easy' ? '#10b981' : qa.difficulty === 'medium' ? '#f59e0b' : '#ef4444',
                              color: '#fff'
                            }}>{qa.difficulty}</span>
                          )}
                          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className={`qa-status ${qa.answered ? 'answered' : 'not-answered'}`}>
                              {qa.answered ? <CheckCircle size={16} /> : <XCircle size={16} />}
                              {qa.answered ? 'Answered' : 'Not Answered'}
                            </div>
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
        </div>
      )}
    </div>
  );
};

export default Dashboard;
