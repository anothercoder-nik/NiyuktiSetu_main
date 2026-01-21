// API service for backend communication
const BACKEND_URL = 'http://localhost:8080'; // Node Gateway
const DEMO_MODE = false; // Set to false when backend is ready

// Simulate API delay
const simulateDelay = (ms = 1000) => new Promise(resolve => setTimeout(resolve, ms));

export const apiService = {
  // Interview Login - Verify credentials (roll_no, dob, rfid)
  interviewLogin: async (loginData) => {
    if (DEMO_MODE) {
      console.log('DEMO MODE: Interview login:', loginData);
      await simulateDelay(800);
      return {
        success: true,
        verified: true,
        message: 'Credentials verified successfully',
        candidate: {
          id: 1,
          name: 'Demo User',
          roll_no: loginData.roll_no,
          rfid: loginData.rfid
        }
      };
    }
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/interview/interview-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roll_no: loginData.roll_no,
          dob: loginData.dob,
          rfid: loginData.rfid
        })
      });
      
      if (!response.ok) {
        throw new Error('Interview login failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error in interview login:', error);
      throw error;
    }
  },

  // Verify Live Face - Send live captured image
  verifyLiveFace: async (imageBlob, roll_no, rfid) => {
    if (DEMO_MODE) {
      console.log('DEMO MODE: Verifying live face');
      await simulateDelay(2000);
      
      const isVerified = Math.random() > 0.1;
      
      return {
        success: true,
        verified: isVerified,
        match: isVerified,
        confidence: isVerified ? 95.67 : 45.23,
        message: isVerified ? 'Face verification successful' : 'Face verification failed',
        candidate: {
          name: 'Demo User',
          roll_no: roll_no
        }
      };
    }
    
    try {
      const formData = new FormData();
      formData.append('roll_no', roll_no);
      formData.append('rfid', rfid);
      formData.append('live_image', imageBlob, 'live_capture.jpg');
      
      const response = await fetch(`${BACKEND_URL}/api/interview/verify-live`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Face verification failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error verifying live face:', error);
      throw error;
    }
  },

  // Submit login details to backend
  submitLoginDetails: async (loginData) => {
    if (DEMO_MODE) {
      console.log('DEMO MODE: Submitting login details:', loginData);
      await simulateDelay(800);
      return {
        success: true,
        message: 'Login details submitted successfully',
        sessionId: 'demo-session-' + Date.now()
      };
    }
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData)
      });
      
      if (!response.ok) {
        throw new Error('Login submission failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error submitting login:', error);
      throw error;
    }
  },

  // Submit face image for verification
  verifyFace: async (imageBlob, sessionId) => {
    if (DEMO_MODE) {
      console.log('DEMO MODE: Verifying face for session:', sessionId);
      await simulateDelay(2000);
      
      // Simulate random verification (90% success rate for demo)
      const isVerified = Math.random() > 0.1;
      
      return {
        success: isVerified,
        verified: isVerified,
        message: isVerified ? 'Face verified successfully' : 'Face verification failed',
        confidence: isVerified ? 0.95 : 0.45
      };
    }
    
    try {
      // Create FormData to send image
      const formData = new FormData();
      formData.append('image', imageBlob, 'face-capture.jpg');
      formData.append('sessionId', sessionId);
      
      // Send to our backend first
      const response = await fetch(`${BACKEND_URL}/api/verify-face`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Face verification failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error verifying face:', error);
      throw error;
    }
  },

  // Submit interview completion
  submitInterviewComplete: async (sessionId, interviewData) => {
    if (DEMO_MODE) {
      console.log('DEMO MODE: Interview completed:', { sessionId, interviewData });
      await simulateDelay(500);
      return {
        success: true,
        message: 'Interview data saved successfully'
      };
    }
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/interview/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          ...interviewData
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit interview data');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error submitting interview:', error);
      throw error;
    }
  },

  // ========================================
  // INTERVIEW QUESTION DELIVERY API
  // ========================================

  // Start Interview - Get first question
  startInterview: async (rfid, roll_no, name) => {
    if (DEMO_MODE) {
      console.log('DEMO MODE: Starting interview');
      await simulateDelay(800);
      return {
        success: true,
        session_id: rfid,
        question: {
          question_id: 0,
          question_number: 1,
          total_questions: 10,
          category: 'Introduction',
          question_text: 'Good Afternoon. Please introduce yourself and tell us about your background.'
        }
      };
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/interview/start-interview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rfid, roll_no, name })
      });

      if (!response.ok) {
        throw new Error('Failed to start interview');
      }

      return await response.json();
    } catch (error) {
      console.error('Error starting interview:', error);
      throw error;
    }
  },

  // Submit Answer - Get next question or completion status
  submitAnswer: async (rfid, answer, question_id) => {
    if (DEMO_MODE) {
      console.log('DEMO MODE: Submitting answer');
      await simulateDelay(1000);
      
      const questionNum = (question_id || 0) + 1;
      const completed = questionNum >= 10;

      if (completed) {
        return {
          success: true,
          completed: true,
          score: {
            question_score: 7.5,
            total_score: 75.0,
            average_score: 7.5,
            questions_answered: 10
          },
          message: 'Interview completed successfully'
        };
      }

      return {
        success: true,
        completed: false,
        score: {
          question_score: 7.5,
          sentiment: 0.8,
          relevance: 0.7
        },
        question: {
          question_id: questionNum,
          question_number: questionNum + 1,
          total_questions: 10,
          category: 'General Knowledge',
          question_text: `Demo question ${questionNum + 1}?`
        }
      };
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/interview/submit-answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rfid, answer, question_id })
      });

      if (!response.ok) {
        throw new Error('Failed to submit answer');
      }

      return await response.json();
    } catch (error) {
      console.error('Error submitting answer:', error);
      throw error;
    }
  },

  // Get Session Status
  getSessionStatus: async (rfid) => {
    if (DEMO_MODE) {
      console.log('DEMO MODE: Getting session status');
      await simulateDelay(300);
      return {
        success: true,
        session: {
          rfid,
          current_question: 1,
          total_questions: 10,
          questions_answered: 0,
          current_score: 0
        }
      };
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/interview/session-status/${rfid}`);

      if (!response.ok) {
        throw new Error('Failed to get session status');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting session status:', error);
      throw error;
    }
  }
};

export const isDemoMode = () => DEMO_MODE;
