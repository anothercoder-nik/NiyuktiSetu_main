import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, ArrowRight, Shield, AlertTriangle } from 'lucide-react';
import HeaderBar from './HeaderBar';
import { apiService, isDemoMode } from '../services/api';
import './InterviewSession.css';

const InterviewSession = ({ sessionId, language = 'english', onComplete, userImage, candidateInfo }) => {
  const navigate = useNavigate();
  const [timeRemaining, setTimeRemaining] = useState(5 * 60);
  const [startTime] = useState(new Date().toISOString());
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [displayedQuestion, setDisplayedQuestion] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState(null);
  const [questionsAndAnswers, setQuestionsAndAnswers] = useState([]);
  const [showNextButton, setShowNextButton] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentScore, setCurrentScore] = useState(0);

  // NLP enhancements
  const [lastScoreBreakdown, setLastScoreBreakdown] = useState(null);
  const [lastTone, setLastTone] = useState(null);
  const [questionDifficulty, setQuestionDifficulty] = useState(null);

  // Anti-spoofing re-verification
  const [showReVerify, setShowReVerify] = useState(false);
  const [reVerifyResult, setReVerifyResult] = useState(null);
  const [reVerifyCount, setReVerifyCount] = useState(0);

  // Fullscreen & security
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
  const interviewActiveRef = useRef(true);
  const fullscreenViolationRef = useRef(0);
  const fullscreenEnteredRef = useRef(false);
  const completionCalledRef = useRef(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const transcriptTimeoutRef = useRef(null);
  const reVerifyTimerRef = useRef(null);
  const faceMonitorRef = useRef(null);
  const multiFaceViolationRef = useRef(0);
  const livenessFailRef = useRef(0);
  const [multiFaceAlert, setMultiFaceAlert] = useState(false);
  const [livenessAlert, setLivenessAlert] = useState(false);

  // ============================================
  // FULLSCREEN ENFORCEMENT & KEYBOARD LOCK
  // ============================================
  const enterFullscreen = useCallback(() => {
    const el = document.documentElement;
    const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (rfs) {
      rfs.call(el).then(() => {
        setIsFullscreen(true);
        setShowFullscreenWarning(false);
        fullscreenEnteredRef.current = true;
        // Use Keyboard Lock API (Chrome) to trap Escape & F11 at OS level
        if (navigator.keyboard && navigator.keyboard.lock) {
          navigator.keyboard.lock(['Escape', 'F11']).then(() => {
            console.log('🔒 Keyboard Lock API: Escape & F11 trapped');
          }).catch(err => console.warn('Keyboard lock failed:', err));
        }
      }).catch(err => {
        console.warn('Fullscreen request denied (normal in non-kiosk Chrome):', err);
        fullscreenEnteredRef.current = false;
      });
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    try {
      // Release keyboard lock first
      if (navigator.keyboard && navigator.keyboard.unlock) {
        navigator.keyboard.unlock();
      }
    } catch (e) { console.warn('Keyboard unlock failed:', e); }
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        const eFS = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
        if (eFS) eFS.call(document).catch(() => { });
      }
    } catch (e) { console.warn('Exit fullscreen failed:', e); }
  }, []);

  useEffect(() => {
    // --- Enter fullscreen on mount ---
    enterFullscreen();

    // --- Keyboard lock: block ALL dangerous keys on BOTH keydown and keyup ---
    const blockKey = (e) => {
      if (!interviewActiveRef.current) return;

      const blocked =
        e.ctrlKey || e.metaKey || e.altKey ||
        e.key === 'Escape' || e.key === 'F11' || e.key === 'F12' ||
        e.key === 'F1' || e.key === 'F2' || e.key === 'F3' ||
        e.key === 'F4' || e.key === 'F5' || e.key === 'F6' ||
        e.key === 'F7' || e.key === 'F8' || e.key === 'F9' ||
        e.key === 'F10' || e.key === 'PrintScreen' || e.key === 'Tab' ||
        e.key === 'ContextMenu' || e.key === 'Meta' || e.key === 'OS';

      if (blocked) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };

    // --- Block right click ---
    const handleContextMenu = (e) => {
      if (interviewActiveRef.current) {
        e.preventDefault();
        return false;
      }
    };

    // --- Detect fullscreen exit and re-enter ---
    const handleFullscreenChange = () => {
      const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
      setIsFullscreen(isFull);

      // Only track violations if fullscreen was actually entered at some point
      if (!isFull && interviewActiveRef.current && fullscreenEnteredRef.current) {
        fullscreenViolationRef.current += 1;
        console.warn(`⚠️ Fullscreen violation #${fullscreenViolationRef.current}`);

        if (fullscreenViolationRef.current > 2) {
          // Auto-terminate interview after 2 violations
          setShowFullscreenWarning(false);
          handleInterviewComplete(false, null);
          return;
        }

        // Show warning and re-enter
        setShowFullscreenWarning(true);
        // Re-enter almost instantly so user barely sees the desktop
        setTimeout(() => {
          if (interviewActiveRef.current) {
            enterFullscreen();
          }
        }, 100);
      }
    };

    // --- Block visibility change (tab switching) ---
    const handleVisibilityChange = () => {
      if (document.hidden && interviewActiveRef.current) {
        console.warn('⚠️ Candidate attempted to switch tabs during interview');
      }
    };

    // Attach all security listeners (capture phase = highest priority)
    document.addEventListener('keydown', blockKey, true);
    document.addEventListener('keyup', blockKey, true);
    document.addEventListener('keypress', blockKey, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('keydown', blockKey, true);
      document.removeEventListener('keyup', blockKey, true);
      document.removeEventListener('keypress', blockKey, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Release keyboard lock on unmount
      if (navigator.keyboard && navigator.keyboard.unlock) navigator.keyboard.unlock();
    };
  }, [enterFullscreen]);

  useEffect(() => {
    initializeInterview();
    startCamera();
    setupSpeechRecognition();

    // Timer countdown
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleInterviewComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Schedule random re-verification (between 60-150 seconds in)
    scheduleReVerification();

    // Start combined monitoring (face-count + liveness in ONE call, every 3 seconds)
    faceMonitorRef.current = setInterval(() => {
      runCombinedMonitor();
    }, 3000);

    return () => {
      clearInterval(timer);
      stopCamera();
      if (recognition) recognition.stop();
      if (reVerifyTimerRef.current) clearTimeout(reVerifyTimerRef.current);
      if (faceMonitorRef.current) clearInterval(faceMonitorRef.current);
    };
  }, []);

  // Schedule a random re-verification during the interview
  const scheduleReVerification = () => {
    const delay = (5 + Math.random() * 5) * 1000; // 5-10 seconds
    reVerifyTimerRef.current = setTimeout(() => {
      triggerReVerification();
    }, delay);
  };

  const triggerReVerification = async () => {
    if (!streamRef.current || !canvasRef.current) return;

    setShowReVerify(true);

    // Capture frame from live video
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!video || !canvas) return;

    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setReVerifyResult({ match: true, confidence: 100, message: 'Frame capture failed, skipped' });
        setTimeout(() => setShowReVerify(false), 3000);
        return;
      }

      try {
        const rfid = candidateInfo?.rfid || sessionId;
        const result = await apiService.reVerify(blob, rfid);
        setReVerifyResult(result);
        setReVerifyCount(prev => prev + 1);

        if (!result.match) {
          console.warn('🚨 IDENTITY MISMATCH DURING INTERVIEW');
        }
      } catch (err) {
        console.error('Re-verification error:', err);
        setReVerifyResult({ match: true, confidence: 0, message: 'Check failed — continuing' });
      }

      // Hide after 4 seconds
      setTimeout(() => {
        setShowReVerify(false);
        setReVerifyResult(null);
        // Schedule next re-verification (90-180 seconds later)
        const nextDelay = (5 + Math.random() * 5) * 1000;
        reVerifyTimerRef.current = setTimeout(() => triggerReVerification(), nextDelay);
      }, 4000);
    }, 'image/jpeg', 0.85);
  };

  // ============================================
  // COMBINED MONITOR — 1 frame, 1 API call, both checks
  // Captures at 320x240 for minimal payload (~75% smaller than 640x480)
  // ============================================
  const runCombinedMonitor = () => {
    if (!streamRef.current || !canvasRef.current || !videoRef.current) return;
    if (!interviewActiveRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    // Downscale to 320x240 for monitoring — much smaller payload, still sufficient for face detection
    canvas.width = 320;
    canvas.height = 240;
    context.drawImage(video, 0, 0, 320, 240);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        const result = await apiService.monitorFrame(blob);

        // --- Handle multi-face detection ---
        if (result.multiple_faces) {
          multiFaceViolationRef.current += 1;
          console.warn(`\u{1F6A8} MULTI-FACE VIOLATION #${multiFaceViolationRef.current}: ${result.face_count} faces detected`);
          setMultiFaceAlert(true);

          if (multiFaceViolationRef.current >= 2) {
            console.error('\u{274C} INTERVIEW TERMINATED: Multiple people detected repeatedly');
            handleInterviewComplete(false, null);
            return;
          }

          setTimeout(() => setMultiFaceAlert(false), 5000);
        } else {
          setMultiFaceAlert(false);
        }

        // --- Handle liveness detection ---
        if (!result.liveness_passed) {
          livenessFailRef.current += 1;
          console.warn(`⚠️ LIVENESS FAIL #${livenessFailRef.current}: no live face detected`);

          // Show alert after 2 consecutive failures (~6 seconds)
          if (livenessFailRef.current >= 2) {
            setLivenessAlert(true);
          }

          // Auto-terminate after 4 consecutive failures (~10 seconds without a live face)
          if (livenessFailRef.current >= 4) {
            console.error('❌ INTERVIEW TERMINATED: No live face detected for extended period');
            handleInterviewComplete(false, null);
            return;
          }
        } else {
          // Reset on success
          if (livenessFailRef.current > 0) {
            livenessFailRef.current = 0;
            setLivenessAlert(false);
          }
        }
      } catch (err) {
        // Silently continue if face API is unavailable
        console.warn('Monitor check failed:', err.message);
      }
    }, 'image/jpeg', 0.5);  // Lower JPEG quality for monitoring — faster upload
  };

  const initializeInterview = async () => {
    try {
      setLoading(true);
      // Map language prop ('hindi'/'english') to API code ('hi'/'en')
      const langCode = language === 'hindi' ? 'hi' : 'en';
      const response = await apiService.startInterview(
        candidateInfo?.rfid || sessionId,
        candidateInfo?.rollNo || 'UNKNOWN',
        candidateInfo?.name || 'Candidate',
        langCode
      );

      if (response.success) {
        setCurrentQuestion(response.question);
        if (response.question?.difficulty) setQuestionDifficulty(response.question.difficulty);
        setInterviewStarted(true);
      } else {
        throw new Error('Failed to start interview');
      }
    } catch (error) {
      console.error('Error initializing interview:', error);
      alert('Failed to start interview. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Reference for current audio playback
  const ttsAudioRef = useRef(null);

  const speakQuestion = async (text) => {
    // Stop any currently playing audio
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    const langCode = language === 'hindi' ? 'hi' : 'en';

    try {
      // Try server-side edge-tts (Azure Neural voice — much more natural)
      const response = await fetch('http://localhost:9091/interview/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: langCode })
      });

      if (response.ok) {
        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        ttsAudioRef.current = audio;
        audio.onended = () => { URL.revokeObjectURL(audioUrl); ttsAudioRef.current = null; };
        audio.onerror = () => { URL.revokeObjectURL(audioUrl); ttsAudioRef.current = null; };
        audio.play();
        console.log(`🔊 Neural TTS playing (${langCode})`);
        return;
      }
    } catch (err) {
      console.warn('⚠️ Server TTS failed, falling back to browser voice:', err.message);
    }

    // Fallback: browser speechSynthesis
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'hindi' ? 'hi-IN' : 'en-IN';
      utterance.rate = 0.88;
      utterance.pitch = 0.9;
      const voices = window.speechSynthesis.getVoices();
      const targetLang = language === 'hindi' ? 'hi-IN' : 'en-IN';
      const bestVoice = voices.find(v => v.lang === targetLang) || voices.find(v => v.lang.includes('IN'));
      if (bestVoice) utterance.voice = bestVoice;
      window.speechSynthesis.speak(utterance);
      console.log('🔊 Browser TTS fallback');
    }
  };

  useEffect(() => {
    // Load browser voices as fallback
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
      return () => { window.speechSynthesis.onvoiceschanged = null; };
    }
  }, []);

  useEffect(() => {
    if (!currentQuestion || !interviewStarted) return;
    if (!currentQuestion.question_text) return;

    const rawText = String(currentQuestion.question_text || '').trim();
    const words = rawText.split(/\s+/).filter(w => w && w.length > 0);

    setDisplayedQuestion('');
    let currentIndex = 0;

    // Small delay to ensure voices are loaded before speaking
    const speakDelay = setTimeout(() => speakQuestion(rawText), 200);

    const wordInterval = setInterval(() => {
      if (currentIndex < words.length && words[currentIndex]) {
        setDisplayedQuestion(prev => prev + (prev ? ' ' : '') + words[currentIndex]);
        currentIndex++;
      } else {
        clearInterval(wordInterval);
        setTimeout(() => startListening(), 500);
      }
    }, 150);

    return () => {
      clearInterval(wordInterval);
      clearTimeout(speakDelay);
    };
  }, [currentQuestion, interviewStarted, language]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
  };

  const [interimTranscript, setInterimTranscript] = useState('');

  const setupSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();

      const isHindi = language === 'hindi';
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = isHindi ? 'hi-IN' : 'en-US';
      recognitionInstance.maxAlternatives = 3; // Better accuracy — picks best from 3 options

      recognitionInstance.onresult = (event) => {
        let finalChunk = '';
        let interimChunk = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            // Pick the highest confidence alternative
            let bestTranscript = event.results[i][0].transcript;
            let bestConfidence = event.results[i][0].confidence;
            for (let j = 1; j < event.results[i].length; j++) {
              if (event.results[i][j].confidence > bestConfidence) {
                bestConfidence = event.results[i][j].confidence;
                bestTranscript = event.results[i][j].transcript;
              }
            }
            finalChunk += bestTranscript + ' ';
          } else {
            interimChunk += event.results[i][0].transcript;
          }
        }

        setInterimTranscript(interimChunk);

        if (finalChunk) {
          setTranscript(prev => {
            const newTranscript = prev + (prev && !prev.endsWith(' ') ? ' ' : '') + finalChunk;
            return newTranscript;
          });
        }

        // Reset silence timeout — longer for Hindi (3s) since speakers may pause more
        const silenceMs = isHindi ? 3000 : 2000;
        if (transcriptTimeoutRef.current) clearTimeout(transcriptTimeoutRef.current);
        transcriptTimeoutRef.current = setTimeout(() => {
          setShowNextButton(true);
          stopListening();
          setInterimTranscript('');
        }, silenceMs);
      };

      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          // Ignore no speech, let the timeout handle it
        } else if (event.error === 'aborted') {
          // Ignore aborted — happens during normal stop
        } else {
          stopListening();
        }
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }
  };

  const startListening = () => {
    if (recognition && !isListening) {
      try {
        recognition.start();
        setIsListening(true);
      } catch (err) {
        console.error('Error starting recognition:', err);
      }
    }
  };

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
    }
  };

  const handleNextQuestion = async () => {
    let hasError = false;
    try {
      if (!currentQuestion) return;

      const currentQA = {
        question: currentQuestion.question_text,
        question_id: currentQuestion.question_id,
        category: currentQuestion.category,
        difficulty: currentQuestion.difficulty || questionDifficulty,
        answer: transcript.trim(),
        answered: transcript.trim().length > 0,
        score_breakdown: null,
        tone: null
      };

      stopListening();
      setShowNextButton(false);
      setLoading(true);

      const response = await apiService.submitAnswer(
        candidateInfo?.rfid || sessionId,
        transcript.trim(),
        currentQuestion.question_id
      );

      if (response.success) {
        // Extract NLP scoring data
        const scoreData = response.score || {};
        const questionScore = scoreData.question_score || 0;

        // Build breakdown from flat response
        const breakdown = {
          keyword_match: scoreData.keyword_match,
          semantic_similarity: scoreData.semantic_similarity,
          completeness: scoreData.completeness,
          coherence: scoreData.coherence
        };

        // Only set breakdown if we have actual values
        const hasBreakdown = breakdown.keyword_match !== undefined;
        if (hasBreakdown) {
          setLastScoreBreakdown(breakdown);
          currentQA.score_breakdown = breakdown;
        }

        // Store tone analysis
        if (scoreData.tone) {
          setLastTone(scoreData.tone);
          currentQA.tone = scoreData.tone;
        }

        currentQA.score = questionScore;
        setQuestionsAndAnswers(prev => [...prev, currentQA]);
        setCurrentScore(prev => prev + questionScore);

        if (response.completed) {
          handleInterviewComplete(true, response.score);
        } else {
          if (!response.question || !response.question.question_text) {
            throw new Error('Invalid question received from server');
          }
          setCurrentQuestion(response.question);
          if (response.question.difficulty) setQuestionDifficulty(response.question.difficulty);
          setTranscript('');
        }
      } else {
        throw new Error(response.message || 'Failed to submit answer');
      }
    } catch (error) {
      hasError = true;
      console.error('Error submitting answer:', error);
      alert(`Error submitting answer: ${error.message}. Please try again.`);
      setLoading(false);
      setShowNextButton(true);
    } finally {
      if (!hasError) setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleInterviewComplete = async (completed = false, finalScore = null) => {
    // Guard against double completion
    if (completionCalledRef.current) return;
    completionCalledRef.current = true;

    // Unlock security measures
    interviewActiveRef.current = false;
    exitFullscreen();

    // Cancel any ongoing TTS
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    stopListening();
    // Aggressively release camera & microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    stopCamera();
    if (recognition) {
      try { recognition.stop(); } catch (e) { }
      try { recognition.abort(); } catch (e) { }
    }
    if (reVerifyTimerRef.current) clearTimeout(reVerifyTimerRef.current);
    if (transcriptTimeoutRef.current) clearTimeout(transcriptTimeoutRef.current);

    const finalQA = [...questionsAndAnswers];
    if (currentQuestion && !questionsAndAnswers.find(qa => qa.question_id === currentQuestion.question_id)) {
      finalQA.push({
        question: currentQuestion.question_text,
        question_id: currentQuestion.question_id,
        category: currentQuestion.category,
        difficulty: currentQuestion.difficulty || questionDifficulty,
        answer: transcript.trim(),
        answered: transcript.trim().length > 0
      });
    }

    const interviewData = {
      candidateInfo: {
        name: candidateInfo?.name || 'Candidate',
        rollNo: candidateInfo?.rollNo || 'N/A',
        rfid: candidateInfo?.rfid || 'N/A',
        dob: candidateInfo?.dob || 'N/A',
        verified: true,
        language: language === 'hindi' ? 'Hindi' : 'English'
      },
      interviewSession: {
        startTime: startTime,
        endTime: new Date().toISOString(),
        duration: (5 * 60) - timeRemaining,
        totalQuestions: finalScore?.questions_answered || finalQA.length,
        answeredQuestions: finalQA.filter(qa => qa.answered).length,
        totalScore: finalScore?.total_score || currentScore,
        averageScore: finalScore?.average_score || (finalQA.length > 0 ? currentScore / finalQA.length : 0),
        status: completed ? 'Complete' : (timeRemaining === 0 ? 'Complete' : 'Exited'),
        reVerificationCount: reVerifyCount
      },
      questionsAndAnswers: finalQA
    };

    try {
      // IMPORTANT: await the save BEFORE navigating
      await apiService.submitInterviewComplete(sessionId, {
        duration: (5 * 60) - timeRemaining,
        questionsAnswered: interviewData.interviewSession.answeredQuestions,
        language,
        completedAt: new Date().toISOString(),
        interviewData
      });
      console.log('✅ Interview report saved to database');
    } catch (error) {
      console.error('Error submitting interview:', error);
    }

    // Navigate AFTER save completes (success or fail)
    navigate('/dashboard', { state: interviewData });
  };

  // Tone emoji mapping
  const toneEmoji = {
    confident: '💪',
    nervous: '😰',
    evasive: '🤔',
    aggressive: '😤',
    thoughtful: '🧠',
    neutral: '😐'
  };

  // Difficulty color mapping
  const difficultyColor = {
    easy: '#10b981',
    medium: '#f59e0b',
    hard: '#ef4444'
  };

  return (
    <div className="interview-session-container">
      {/* Hidden canvas for re-verification frame capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Fullscreen warning overlay */}
      {showFullscreenWarning && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.95)', zIndex: 9999,
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          color: '#fff', gap: 16, backdropFilter: 'blur(8px)'
        }}>
          <AlertTriangle size={64} color="#f59e0b" />
          <h2 style={{ fontSize: 28, fontWeight: 700 }}>⚠️ SECURITY VIOLATION ({fullscreenViolationRef.current}/2)</h2>
          <p style={{ fontSize: 16, color: '#d1d5db', maxWidth: 500, textAlign: 'center' }}>
            Exiting fullscreen during a government interview is prohibited.
            {fullscreenViolationRef.current >= 2
              ? ' This is your final warning. One more attempt will terminate the interview.'
              : ' Returning to secure mode automatically...'}
          </p>
        </div>
      )}

      {loading && !interviewStarted && (
        <div className="loading-overlay">
          <div className="loading-message">
            <div style={{ marginBottom: 20 }}>
              <div className="audio-wave">
                {[...Array(5)].map((_, i) => <div key={i} className="wave-bar" />)}
              </div>
            </div>
            <h2>Preparing Interview Environment</h2>
            <p>Setting up secure session and loading questions...</p>
          </div>
        </div>
      )}

      {/* Re-verification overlay */}
      {showReVerify && (
        <div style={{
          position: 'fixed', top: 88, right: 20, zIndex: 1000,
          padding: '12px 20px', borderRadius: 12,
          background: reVerifyResult
            ? (reVerifyResult.match ? 'rgba(16,185,129,0.95)' : 'rgba(239,68,68,0.95)')
            : 'rgba(59,130,246,0.95)',
          color: '#fff', fontSize: 14, fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', gap: 8,
          backdropFilter: 'blur(8px)',
          animation: 'fadeIn 0.3s ease'
        }}>
          <Shield size={18} />
          {!reVerifyResult ? (
            'Identity re-verification in progress...'
          ) : reVerifyResult.match ? (
            `✅ Identity confirmed (${reVerifyResult.confidence}%)`
          ) : (
            <>
              <AlertTriangle size={18} />
              {`⚠️ Identity mismatch (${reVerifyResult.confidence}%)`}
            </>
          )}
        </div>
      )}

      {/* Liveness failure alert */}
      {livenessAlert && (
        <div style={{
          position: 'fixed', top: 88, left: 20, zIndex: 1000,
          padding: '12px 20px', borderRadius: 12,
          background: 'rgba(239,68,68,0.95)',
          color: '#fff', fontSize: 14, fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', gap: 8,
          backdropFilter: 'blur(8px)',
          animation: 'fadeIn 0.3s ease'
        }}>
          <AlertTriangle size={18} />
          ⚠️ No live face detected — please face the camera
        </div>
      )}

      {/* Multi-face detection alert */}
      {multiFaceAlert && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(127,29,29,0.97)', zIndex: 10000,
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          color: '#fff', gap: 20, backdropFilter: 'blur(12px)'
        }}>
          <div style={{
            width: 100, height: 100, borderRadius: '50%',
            background: 'rgba(239,68,68,0.2)', border: '3px solid #fbbf24',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'micGlow 1.5s ease-in-out infinite'
          }}>
            <AlertTriangle size={48} color="#fbbf24" />
          </div>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.5px' }}>MULTIPLE PERSONS DETECTED</h2>
          <p style={{ fontSize: 17, color: '#fecaca', maxWidth: 550, textAlign: 'center', lineHeight: 1.7 }}>
            The camera has detected more than one person in the frame.
            This is a serious security violation in a government interview.
          </p>
          <div style={{
            padding: '8px 24px', borderRadius: 8, background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(239,68,68,0.3)', fontSize: 14, color: '#fca5a5'
          }}>
            Violation {multiFaceViolationRef.current} of 2 — Next violation will terminate the interview
          </div>
        </div>
      )}

      <div className="interview-main-content">
        {/* Top Status Bar: Video + Interview Info */}
        <div className="center-video-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {userImage ? (
              <div className="user-image-wrapper">
                <img src={userImage} alt="User" className="user-feed-image" />
              </div>
            ) : (
              <video ref={videoRef} autoPlay playsInline muted className="user-video-feed" />
            )}
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>
                {candidateInfo?.name || 'Candidate'}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                {candidateInfo?.rollNo || 'Interview Session'}
              </div>
            </div>
          </div>

          {/* Live indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 50,
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)'
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', background: '#ef4444',
                animation: 'textBlink 1.5s ease-in-out infinite'
              }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fca5a5', letterSpacing: 1 }}>LIVE</span>
            </div>

            {/* Security badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 50,
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)'
            }}>
              <Shield size={14} color="#22c55e" />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#86efac' }}>Secured</span>
            </div>
          </div>

          {/* Timer */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 20px', borderRadius: 12,
            background: timeRemaining <= 60 ? 'rgba(239,68,68,0.15)' : 'rgba(249,115,22,0.1)',
            border: `1px solid ${timeRemaining <= 60 ? 'rgba(239,68,68,0.3)' : 'rgba(249,115,22,0.2)'}`
          }}>
            <span style={{
              fontFamily: "'JetBrains Mono', 'Courier New', monospace",
              fontSize: 22, fontWeight: 700,
              color: timeRemaining <= 60 ? '#fca5a5' : '#f97316',
              letterSpacing: 2
            }}>
              {formatTime(timeRemaining)}
            </span>
          </div>
        </div>

        {/* Question and answer section */}
        {interviewStarted && currentQuestion && (
          <div className="question-answer-section">
            {/* Question Card */}
            <div className="question-field">
              <div className="field-header">
                <span className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)',
                    padding: '3px 12px', borderRadius: 6, fontSize: 12, fontWeight: 800
                  }}>
                    Q{currentQuestion.question_number}/{currentQuestion.total_questions}
                  </span>
                  <span style={{ color: '#60a5fa', fontWeight: 600, textTransform: 'capitalize', letterSpacing: 0 }}>
                    {currentQuestion.category}
                  </span>
                  {(currentQuestion.difficulty || questionDifficulty) && (
                    <span style={{
                      padding: '3px 10px', borderRadius: 6, fontSize: 11,
                      fontWeight: 700, textTransform: 'uppercase',
                      background: difficultyColor[currentQuestion.difficulty || questionDifficulty] || '#6b7280',
                      color: '#fff'
                    }}>
                      {currentQuestion.difficulty || questionDifficulty}
                    </span>
                  )}
                </span>
                <button className="exit-interview-button" onClick={() => handleInterviewComplete(false)}>
                  EXIT INTERVIEW
                </button>
              </div>
              <div className="question-text">
                {displayedQuestion}
              </div>
            </div>

            {/* NLP Feedback badges */}
            {(lastScoreBreakdown || lastTone) && (
              <div style={{
                display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 12,
                padding: '0 4px'
              }}>
                <span style={{ color: '#64748b', fontWeight: 600, marginRight: 4 }}>Last response:</span>
                {lastTone && (
                  <span style={{
                    padding: '4px 12px', borderRadius: 50,
                    background: 'rgba(99,102,241,0.1)', color: '#a5b4fc',
                    border: '1px solid rgba(99,102,241,0.2)', fontWeight: 600
                  }}>
                    {toneEmoji[lastTone] || '😐'} {lastTone}
                  </span>
                )}
                {lastScoreBreakdown && (
                  <>
                    <span style={{ padding: '4px 12px', borderRadius: 50, background: 'rgba(16,185,129,0.08)', color: '#34d399', border: '1px solid rgba(16,185,129,0.15)', fontWeight: 600 }}>
                      Keywords {lastScoreBreakdown.keyword_match?.toFixed(1) || '—'}
                    </span>
                    <span style={{ padding: '4px 12px', borderRadius: 50, background: 'rgba(59,130,246,0.08)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.15)', fontWeight: 600 }}>
                      Relevance {lastScoreBreakdown.semantic_similarity?.toFixed(1) || '—'}
                    </span>
                    <span style={{ padding: '4px 12px', borderRadius: 50, background: 'rgba(249,115,22,0.08)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.15)', fontWeight: 600 }}>
                      Complete {lastScoreBreakdown.completeness?.toFixed(1) || '—'}
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Answer Card */}
            <div className="answer-field">
              <div className="field-header">
                <span className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  Your Response
                  {isListening && (
                    <span style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '2px 10px', borderRadius: 50,
                      background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)'
                    }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: '50%', background: '#ef4444',
                        animation: 'textBlink 1s ease-in-out infinite'
                      }} />
                      <span style={{ fontSize: 11, color: '#fca5a5', fontWeight: 700 }}>REC</span>
                    </span>
                  )}
                </span>
                <div className="control-buttons">
                  <button
                    className={`mic-button ${isListening ? 'active' : ''}`}
                    onClick={isListening ? stopListening : startListening}
                    disabled={showNextButton || loading}
                    title={isListening ? "Stop Recording" : "Start Recording"}
                  >
                    <Mic size={18} />
                    {isListening ? 'Stop' : 'Speak'}
                  </button>

                  {showNextButton && !loading && (
                    <button className="next-button pulse" onClick={handleNextQuestion}>
                      <span>Next Question</span>
                      <ArrowRight size={18} />
                    </button>
                  )}

                  {loading && <span className="loading-text">Processing...</span>}
                </div>
              </div>

              {/* Audio wave visualizer when recording */}
              {isListening && (
                <div style={{
                  padding: '12px 28px',
                  background: 'rgba(239,68,68,0.04)',
                  borderBottom: '1px solid rgba(239,68,68,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3
                }}>
                  {[...Array(20)].map((_, i) => (
                    <div key={i} style={{
                      width: 3, borderRadius: 3,
                      background: 'linear-gradient(to top, #ef4444, #f97316)',
                      animation: `waveAnim ${0.4 + Math.random() * 0.6}s ease-in-out ${i * 0.05}s infinite`,
                      height: `${12 + Math.random() * 24}px`
                    }} />
                  ))}
                </div>
              )}

              <textarea
                value={transcript + (interimTranscript ? (transcript && !transcript.endsWith(' ') ? ' ' : '') + interimTranscript : '')}
                readOnly
                placeholder={isListening ? "Listening to your answer..." : "Click \"Speak\" to begin recording your answer"}
                className="answer-textarea"
              />
            </div>

            {/* Progress Bar */}
            <div className="questions-progress">
              <span className="progress-text">
                <span>
                  Questions Completed: {questionsAndAnswers.filter(qa => qa.answered).length} / {currentQuestion.total_questions}
                  {reVerifyCount > 0 && (
                    <span style={{ marginLeft: 12, color: '#86efac', fontSize: 11, fontWeight: 600 }}>
                      🛡️ {reVerifyCount} identity check{reVerifyCount > 1 ? 's' : ''} passed
                    </span>
                  )}
                </span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#f97316' }}>
                  {Math.round((questionsAndAnswers.filter(qa => qa.answered).length / currentQuestion.total_questions) * 100)}%
                </span>
              </span>
              <div className="progress-bar-wrapper">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${(questionsAndAnswers.filter(qa => qa.answered).length / currentQuestion.total_questions) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {timeRemaining === 0 && (
        <div className="completion-overlay">
          <div className="completion-message">
            <div style={{ marginBottom: 20 }}>
              <div className="audio-wave">
                {[...Array(5)].map((_, i) => <div key={i} className="wave-bar" />)}
              </div>
            </div>
            <h2>Interview Completed!</h2>
            <p>Generating your performance report...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewSession;
