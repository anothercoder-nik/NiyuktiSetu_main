import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, ArrowRight } from 'lucide-react';
import HeaderBar from './HeaderBar';
import { apiService, isDemoMode } from '../services/api';
import './InterviewSession.css';

const InterviewSession = ({ sessionId, language = 'english', onComplete, userImage, candidateInfo }) => {
  const navigate = useNavigate();
  const [timeRemaining, setTimeRemaining] = useState(5 * 60); // 5 minutes in seconds
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
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const transcriptTimeoutRef = useRef(null);

  useEffect(() => {
    // Initialize interview
    initializeInterview();

    // Start camera
    startCamera();

    // Setup speech recognition
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

    return () => {
      clearInterval(timer);
      stopCamera();
      if (recognition) {
        recognition.stop();
      }
    };
  }, []);

  const initializeInterview = async () => {
    try {
      setLoading(true);
      console.log('🎯 Initializing interview...');
      
      // Call API to start interview and get first question
      const response = await apiService.startInterview(
        candidateInfo?.rfid || sessionId,
        candidateInfo?.rollNo || 'UNKNOWN',
        candidateInfo?.name || 'Candidate'
      );

      if (response.success) {
        setCurrentQuestion(response.question);
        setInterviewStarted(true);
        console.log('✅ Interview started, first question loaded');
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

  useEffect(() => {
    if (!currentQuestion || !interviewStarted) return;

    // Validate question text
    if (!currentQuestion.question_text) {
      console.error('❌ Invalid question - missing question_text:', currentQuestion);
      return;
    }

    // Log raw question data
    console.log('🔍 Raw question data:', {
      text: currentQuestion.question_text,
      type: typeof currentQuestion.question_text,
      length: currentQuestion.question_text.length
    });

    // Clean and prepare question text - STRICT filtering
    const rawText = String(currentQuestion.question_text).trim();
    const words = rawText
      .split(/\s+/)  // Split by any whitespace
      .filter(word => {
        // Remove empty, undefined, null, and 'undefined' string
        return word && 
               word !== 'undefined' && 
               word !== 'null' && 
               word.length > 0 &&
               word !== 'NaN';
      });
    
    console.log('📝 Question animation started:');
    console.log('   Original:', rawText);
    console.log('   Words array:', words);
    console.log('   Word count:', words.length);
    
    // Reset displayed question FIRST
    setDisplayedQuestion('');
    
    // Animate question text word by word
    let currentIndex = 0;

    const wordInterval = setInterval(() => {
      if (currentIndex < words.length) {
        const nextWord = words[currentIndex];
        console.log(`   Adding word ${currentIndex + 1}/${words.length}: "${nextWord}"`);
        setDisplayedQuestion(prev => prev + (prev ? ' ' : '') + nextWord);
        currentIndex++;
      } else {
        console.log('✅ Question animation complete');
        clearInterval(wordInterval);
        // Start listening after question is fully displayed
        setTimeout(() => {
          startListening();
        }, 500);
      }
    }, 150); // 150ms per word

    return () => {
      console.log('🧹 Cleaning up question animation');
      clearInterval(wordInterval);
    };
  }, [currentQuestion, interviewStarted]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const setupSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = language === 'hindi' ? 'hi-IN' : 'en-US';

      recognitionInstance.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          setTranscript(prev => {
            const newTranscript = prev + finalTranscript;
            
            // Clear existing timeout
            if (transcriptTimeoutRef.current) {
              clearTimeout(transcriptTimeoutRef.current);
            }
            
            // Show next button after 2 seconds of no speech
            transcriptTimeoutRef.current = setTimeout(() => {
              if (newTranscript.trim().length > 0) {
                setShowNextButton(true);
                stopListening();
              }
            }, 2000);
            
            return newTranscript;
          });
        }
      };

      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
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
      // Validate current question
      if (!currentQuestion) {
        console.error('No current question available');
        return;
      }

      // Save current question and answer
      const currentQA = {
        question: currentQuestion.question_text,
        question_id: currentQuestion.question_id,
        category: currentQuestion.category,
        answer: transcript.trim(),
        answered: transcript.trim().length > 0
      };
      
      setQuestionsAndAnswers(prev => [...prev, currentQA]);
      
      stopListening();
      setShowNextButton(false);
      setLoading(true);

      console.log(`📝 Submitting answer for Q${currentQuestion.question_number}...`);
      console.log(`Answer length: ${transcript.trim().length} chars`);

      // Submit answer to backend/NLP API
      const response = await apiService.submitAnswer(
        candidateInfo?.rfid || sessionId,
        transcript.trim(),
        currentQuestion.question_id
      );

      if (response.success) {
        console.log(`✅ Answer submitted. Score: ${response.score.question_score}/10`);
        
        // Update cumulative score
        if (response.score.question_score) {
          setCurrentScore(prev => prev + response.score.question_score);
        }

        if (response.completed) {
          // Interview completed
          console.log('🎉 Interview completed!');
          handleInterviewComplete(true, response.score);
        } else {
          // Validate next question
          if (!response.question || !response.question.question_text) {
            console.error('Invalid next question received:', response.question);
            throw new Error('Invalid question received from server');
          }

          // Load next question
          setCurrentQuestion(response.question);
          setTranscript('');
          console.log(`➡️ Next question loaded: Q${response.question.question_number} - ${response.question.category}`);
        }
      } else {
        throw new Error(response.message || 'Failed to submit answer');
      }
    } catch (error) {
      hasError = true;
      console.error('Error submitting answer:', error);
      alert(`Error submitting answer: ${error.message}. Please try again.`);
      setLoading(false);
      setShowNextButton(true); // Allow retry
    } finally {
      if (!hasError) {
        setLoading(false);
      }
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleInterviewComplete = async (completed = false, finalScore = null) => {
    stopListening();
    stopCamera();

    // Add current question/answer if not already added
    const finalQA = [...questionsAndAnswers];
    if (currentQuestion && 
        !questionsAndAnswers.find(qa => qa.question_id === currentQuestion.question_id)) {
      finalQA.push({
        question: currentQuestion.question_text,
        question_id: currentQuestion.question_id,
        category: currentQuestion.category,
        answer: transcript.trim(),
        answered: transcript.trim().length > 0
      });
    }

    // Prepare interview data for dashboard
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
        averageScore: finalScore?.average_score || (currentScore / finalQA.length),
        status: completed ? 'Complete' : (timeRemaining === 0 ? 'Complete' : 'Exited')
      },
      questionsAndAnswers: finalQA
    };

    try {
      await apiService.submitInterviewComplete(sessionId, {
        duration: (5 * 60) - timeRemaining,
        questionsAnswered: interviewData.interviewSession.answeredQuestions,
        language,
        completedAt: new Date().toISOString(),
        interviewData: interviewData
      });

      setTimeout(() => {
        // Navigate to dashboard with interview data
        navigate('/dashboard', { state: interviewData });
      }, 1000);
    } catch (error) {
      console.error('Error submitting interview:', error);
      // Still navigate to dashboard even if API fails
      setTimeout(() => {
        navigate('/dashboard', { state: interviewData });
      }, 1000);
    }
  };

  return (
    <div className="interview-session-container">
      <HeaderBar time={formatTime(timeRemaining)} />

      {loading && !interviewStarted && (
        <div className="loading-overlay">
          <div className="loading-message">
            <h2>Starting Interview...</h2>
            <p>Loading questions from NLP system...</p>
          </div>
        </div>
      )}

      <div className="interview-main-content">
        {/* User video feed in center */}
        <div className="center-video-section">
          {userImage ? (
            <div className="user-image-wrapper">
              <img src={userImage} alt="User" className="user-feed-image" />
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="user-video-feed"
            />
          )}
        </div>

        {/* Question and answer section */}
        {interviewStarted && currentQuestion && (
          <div className="question-answer-section">
            {/* Question Field */}
            <div className="question-field">
              <div className="field-header">
                <span className="field-label">
                  Question {currentQuestion.question_number} of {currentQuestion.total_questions} - {currentQuestion.category}
                </span>
                <button className="exit-interview-button" onClick={() => handleInterviewComplete(false)}>
                  EXIT INTERVIEW
                </button>
              </div>
              <div className="question-text">
                {displayedQuestion}
              </div>
            </div>

            {/* Answer Field */}
            <div className="answer-field">
              <div className="field-header">
                <span className="field-label">Your Answer</span>
                <div className="control-buttons">
                  <button 
                    className={`mic-button ${isListening ? 'active' : ''}`}
                    onClick={isListening ? stopListening : startListening}
                    disabled={showNextButton || loading}
                    title={isListening ? "Stop Recording" : "Start Recording"}
                  >
                    <Mic size={24} />
                    {isListening && <span className="recording-text">Recording...</span>}
                  </button>
                  
                  {showNextButton && !loading && (
                    <button className="next-button pulse" onClick={handleNextQuestion}>
                      <ArrowRight size={24} />
                      <span>Next Question</span>
                    </button>
                  )}

                  {loading && (
                    <span className="loading-text">Processing...</span>
                  )}
                </div>
              </div>
              <textarea
                value={transcript}
                readOnly
                placeholder={isListening ? "Listening to your answer..." : "Click the microphone to start recording your answer"}
                className="answer-textarea"
              />
            </div>

            {/* Questions Progress */}
            <div className="questions-progress">
              <span className="progress-text">
                Questions Attempted: {questionsAndAnswers.filter(qa => qa.answered).length} of {currentQuestion.total_questions} | Score: {currentScore.toFixed(1)}/100
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

        {isDemoMode() && (
          <div className="demo-notice">
            <p>🎭 Demo Mode - Speech Recognition Active</p>
          </div>
        )}
      </div>

      {timeRemaining === 0 && (
        <div className="completion-overlay">
          <div className="completion-message">
            <h2>Interview Completed!</h2>
            <p>Generating your report...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewSession;
