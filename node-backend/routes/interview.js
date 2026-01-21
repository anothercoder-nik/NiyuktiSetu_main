const express = require('express');
const router = express.Router();
const db = require('../config/database');
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

console.log('📋 Interview routes loaded');

// NLP Model API URL
const NLP_API_URL = 'http://localhost:6000';

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/live_captures';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `live_${Date.now()}_${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only .jpg, .jpeg, .png images are allowed'));
        }
    }
});

// POST /interview-login - Verify Roll No, DOB, RFID (in that order)
router.post('/interview-login', async (req, res) => {
    try {
        console.log('=== INTERVIEW LOGIN REQUEST RECEIVED ===');
        const { roll_no, dob, rfid } = req.body;

        if (!roll_no || !dob || !rfid) {
            return res.status(400).json({ 
                success: false,
                message: 'Roll No, DOB, and RFID are required' 
            });
        }

        console.log(`Verifying credentials: Roll No=${roll_no}, DOB=${dob}, RFID=${rfid}`);

        // Query NIC government database (simulated)
        const [candidates] = await db.query(
            'SELECT * FROM interview_candidates WHERE rfid = ? AND roll_no = ? AND dob = ?',
            [rfid, roll_no, dob]
        );

        if (candidates.length === 0) {
            console.log('❌ Credentials not found in database');
            return res.status(404).json({
                success: false,
                verified: false,
                message: 'Invalid credentials. Candidate not found in NIC database.'
            });
        }

        const candidate = candidates[0];
        console.log(`✅ Credentials verified for: ${candidate.name}`);

        // Log verification attempt
        await db.query(
            'INSERT INTO interview_verifications (candidate_id, rfid, roll_no, credentials_verified, ip_address) VALUES (?, ?, ?, true, ?)',
            [candidate.id, rfid, roll_no, req.ip]
        );

        res.status(200).json({
            success: true,
            verified: true,
            message: 'Credentials verified successfully',
            candidate: {
                id: candidate.id,
                name: candidate.name,
                roll_no: candidate.roll_no,
                rfid: candidate.rfid
            }
        });

    } catch (error) {
        console.error('Error in interview-login:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to verify credentials', 
            error: error.message 
        });
    }
});

// POST /verify-live - Verify live captured image with reference image
router.post('/verify-live', upload.single('live_image'), async (req, res) => {
    try {
        console.log('=== LIVE FACE VERIFICATION REQUEST RECEIVED ===');
        console.log('Request body:', req.body);
        console.log('Request file:', req.file ? 'File present' : 'No file');
        
        const { rfid, roll_no } = req.body;
        const liveImageFile = req.file;

        if (!rfid || !roll_no) {
            console.log('❌ Missing fields - rfid:', rfid, 'roll_no:', roll_no);
            return res.status(400).json({
                success: false,
                message: 'RFID and Roll No are required'
            });
        }

        if (!liveImageFile) {
            return res.status(400).json({
                success: false,
                message: 'Live image is required'
            });
        }

        console.log(`Live face verification for: Roll No=${roll_no}, RFID=${rfid}`);
        console.log(`Live image: ${liveImageFile.path}`);

        // Get candidate from database
        const [candidates] = await db.query(
            'SELECT * FROM interview_candidates WHERE rfid = ? AND roll_no = ?',
            [rfid, roll_no]
        );

        if (candidates.length === 0) {
            return res.status(404).json({
                success: false,
                verified: false,
                message: 'Candidate not found'
            });
        }

        const candidate = candidates[0];
        const referenceImagePath = path.join(__dirname, '..', candidate.reference_image_path);

        console.log(`Reference image: ${referenceImagePath}`);

        // Check if reference image exists
        if (!fs.existsSync(referenceImagePath)) {
            console.error(`❌ Reference image not found: ${referenceImagePath}`);
            return res.status(500).json({
                success: false,
                message: 'Reference image not found in database'
            });
        }

        // Call face verification API
        const formData = new FormData();
        formData.append('image1', fs.createReadStream(referenceImagePath));
        formData.append('image2', fs.createReadStream(liveImageFile.path));

        console.log('📡 Calling face verification API...');

        let faceApiResponse;
        try {
            faceApiResponse = await axios.post(
                'http://localhost:5000/verify',
                formData,
                {
                    headers: formData.getHeaders(),
                    timeout: 30000 // 30 seconds timeout
                }
            );
        } catch (apiError) {
            console.error('❌ Face API Error:', apiError.message);
            if (apiError.code === 'ECONNREFUSED') {
                throw new Error('Face Verification API is not running. Please start it on port 5000.');
            }
            throw new Error(`Face API request failed: ${apiError.message}`);
        }

        console.log('Face API Response:', faceApiResponse.data);

        const { match, confidence } = faceApiResponse.data;
        const verified = match === true;

        // Update verification log
        await db.query(
            `UPDATE interview_verifications 
             SET face_verified = ?, confidence_score = ?, live_image_path = ?, status = ?
             WHERE candidate_id = ? 
             ORDER BY verification_timestamp DESC 
             LIMIT 1`,
            [verified, confidence, liveImageFile.path, verified ? 'verified' : 'failed', candidate.id]
        );

        console.log(`${verified ? '✅' : '❌'} Face verification: ${verified ? 'PASSED' : 'FAILED'} (Confidence: ${confidence}%)`);

        res.status(200).json({
            success: true,
            verified: verified,
            match: match,
            confidence: confidence,
            message: verified ? 'Face verification successful' : 'Face verification failed',
            candidate: {
                name: candidate.name,
                roll_no: candidate.roll_no
            }
        });

    } catch (error) {
        console.error('Error in verify-face:', error.message);
        
        // Clean up uploaded file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            success: false,
            verified: false,
            message: 'Face verification failed',
            error: error.message
        });
    }
});

// GET /candidate/:rfid - Get candidate details (for testing)
router.get('/candidate/:rfid', async (req, res) => {
    try {
        const { rfid } = req.params;
        
        const [candidates] = await db.query(
            'SELECT id, rfid, roll_no, name, dob, reference_image_path FROM interview_candidates WHERE rfid = ?',
            [rfid]
        );

        if (candidates.length === 0) {
            return res.status(404).json({ message: 'Candidate not found' });
        }

        res.status(200).json(candidates[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching candidate', error: error.message });
    }
});

// ========================================
// INTERVIEW QUESTION DELIVERY ENDPOINTS
// ========================================

// POST /start-interview - Start interview session and get first question
router.post('/start-interview', async (req, res) => {
    try {
        const { rfid, roll_no, name } = req.body;

        if (!rfid || !roll_no) {
            return res.status(400).json({
                success: false,
                message: 'RFID and Roll No are required'
            });
        }

        console.log(`🎯 Starting interview for: ${name} (${rfid})`);

        // Call NLP Model API to start interview
        const response = await axios.post(`${NLP_API_URL}/start-interview`, {
            rfid,
            roll_no,
            name
        });

        console.log(`✅ First question retrieved for ${rfid}`);

        res.status(200).json({
            success: true,
            session_id: response.data.session_id,
            question: response.data.question
        });

    } catch (error) {
        console.error('Error starting interview:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                success: false,
                message: 'Question delivery service is unavailable. Please contact administrator.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error starting interview',
            error: error.message
        });
    }
});

// POST /submit-answer - Submit answer and get next question
router.post('/submit-answer', async (req, res) => {
    try {
        const { rfid, answer, question_id } = req.body;

        if (!rfid) {
            return res.status(400).json({
                success: false,
                message: 'RFID is required'
            });
        }

        console.log(`📝 Submitting answer for RFID: ${rfid}, Question ID: ${question_id}`);

        // Call NLP Model API to evaluate answer and get next question
        const response = await axios.post(`${NLP_API_URL}/submit-answer`, {
            rfid,
            answer: answer || '',
            question_id
        });

        const { completed, score, question } = response.data;

        if (completed) {
            console.log(`✅ Interview completed for ${rfid}, Total Score: ${score.total_score}`);
            
            // Update interview status in database (removed interview_completed_at as column doesn't exist)
            await db.query(
                `UPDATE interview_verifications 
                 SET status = 'completed'
                 WHERE candidate_id = (SELECT id FROM interview_candidates WHERE rfid = ?)
                 ORDER BY verification_timestamp DESC 
                 LIMIT 1`,
                [rfid]
            );

            return res.status(200).json({
                success: true,
                completed: true,
                score: score,
                message: 'Interview completed successfully'
            });
        }

        console.log(`➡️ Next question for ${rfid}: Q${question.question_number}`);

        res.status(200).json({
            success: true,
            completed: false,
            score: score,
            question: question
        });

    } catch (error) {
        console.error('Error submitting answer:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                success: false,
                message: 'Question delivery service is unavailable.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error processing answer',
            error: error.message
        });
    }
});

// POST /complete - Interview completion endpoint (for frontend compatibility)
router.post('/complete', async (req, res) => {
    try {
        const { sessionId, duration, questionsAnswered, language, completedAt, interviewData } = req.body;

        console.log(`✅ Interview completion data received for session: ${sessionId}`);
        console.log(`Duration: ${duration}s, Questions: ${questionsAnswered}, Language: ${language}`);

        // In a real implementation, you might want to:
        // 1. Store the detailed interview data in a separate table
        // 2. Generate a PDF report
        // 3. Send email notification
        
        // For now, just acknowledge receipt
        res.status(200).json({
            success: true,
            message: 'Interview completion data saved successfully',
            sessionId: sessionId
        });

    } catch (error) {
        console.error('Error saving interview completion:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error saving interview data',
            error: error.message
        });
    }
});

// GET /session-status/:rfid - Get current interview session status
router.get('/session-status/:rfid', async (req, res) => {
    try {
        const { rfid } = req.params;

        const response = await axios.get(`${NLP_API_URL}/get-session`, {
            params: { rfid }
        });

        res.status(200).json(response.data);

    } catch (error) {
        if (error.response?.status === 404) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error fetching session',
            error: error.message
        });
    }
});

module.exports = router;
