const express = require('express');
const router = express.Router();
const InterviewCandidate = require('../models/InterviewCandidate');
const InterviewVerification = require('../models/InterviewVerification');
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
    },
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
    },
});

const { authenticateToken } = require('../middleware/auth');

// POST /interview-login - Verify Roll No, DOB, RFID (in that order)
router.post('/interview-login', authenticateToken, async (req, res) => {
    try {
        console.log('=== INTERVIEW LOGIN REQUEST RECEIVED ===');
        const { roll_no, dob, rfid } = req.body;

        if (!roll_no || !dob || !rfid) {
            return res.status(400).json({
                success: false,
                message: 'Roll No, DOB, and RFID are required',
            });
        }

        // Security check: Verify the RFID matches the logged-in User's bound RFID
        const User = require('../models/User');
        const currentUser = await User.findById(req.user.id);

        if (currentUser.rfid) {
            // User already has a bound RFID. Ensure it matches.
            if (currentUser.rfid !== rfid) {
                return res.status(403).json({
                    success: false,
                    verified: false,
                    message: 'Access Denied: The provided RFID does not match your account profile.',
                });
            }
        } else {
            // First time using an RFID, bind it to this account permanently
            // Check if this RFID is already bound to someone else
            const existingUser = await User.findOne({ rfid: rfid });
            if (existingUser && existingUser._id.toString() !== currentUser._id.toString()) {
                return res.status(403).json({
                    success: false,
                    verified: false,
                    message: 'Access Denied: This RFID is already registered to another account.',
                });
            }

            // Bind it
            currentUser.rfid = rfid;
            await currentUser.save();
            console.log(`Bound new RFID ${rfid} to user ${currentUser.email}`);
        }

        console.log(`Verifying credentials: Roll No=${roll_no}, DOB=${dob}, RFID=${rfid}`);

        // Parse DOB
        let parsedDob;
        if (typeof dob === 'string' && dob.includes('/')) {
            const [day, month, year] = dob.split('/');
            parsedDob = new Date(`${year}-${month}-${day}`);
        } else {
            parsedDob = new Date(dob);
        }

        // Query NIC government database (simulated)
        const candidate = await InterviewCandidate.findOne({
            rfid,
            rollNo: roll_no,
            dob: parsedDob,
        });

        if (!candidate) {
            console.log('❌ Credentials not found in database');
            return res.status(404).json({
                success: false,
                verified: false,
                message: 'Invalid credentials. Candidate not found in NIC database.',
            });
        }

        console.log(`✅ Credentials verified for: ${candidate.name}`);

        // Security check: Verify the NIC candidate email matches the logged-in user's email
        if (candidate.email && candidate.email.toLowerCase() !== currentUser.email.toLowerCase()) {
            console.log(`❌ Email mismatch: NIC record has ${candidate.email}, logged-in user is ${currentUser.email}`);
            return res.status(403).json({
                success: false,
                verified: false,
                message: 'Access Denied: Your logged-in email does not match the candidate record in the NIC database.',
            });
        }

        // Log verification attempt
        await InterviewVerification.create({
            candidateId: candidate._id,
            rfid,
            rollNo: roll_no,
            credentialsVerified: true,
            ipAddress: req.ip,
        });

        res.status(200).json({
            success: true,
            verified: true,
            message: 'Credentials verified successfully',
            candidate: {
                id: candidate._id,
                name: candidate.name,
                roll_no: candidate.rollNo,
                rfid: candidate.rfid,
            },
        });
    } catch (error) {
        console.error('Error in interview-login:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify credentials',
            error: error.message,
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
                message: 'RFID and Roll No are required',
            });
        }

        if (!liveImageFile) {
            return res.status(400).json({
                success: false,
                message: 'Live image is required',
            });
        }

        console.log(`Live face verification for: Roll No=${roll_no}, RFID=${rfid}`);
        console.log(`Live image: ${liveImageFile.path}`);

        // Get candidate from database
        const candidate = await InterviewCandidate.findOne({
            rfid,
            rollNo: roll_no,
        });

        if (!candidate) {
            return res.status(404).json({
                success: false,
                verified: false,
                message: 'Candidate not found',
            });
        }

        const referenceImagePath = path.join(__dirname, '..', candidate.referenceImagePath);

        console.log(`Reference image: ${referenceImagePath}`);

        // Check if reference image exists
        if (!fs.existsSync(referenceImagePath)) {
            console.error(`❌ Reference image not found: ${referenceImagePath}`);
            return res.status(500).json({
                success: false,
                message: 'Reference image not found in database',
            });
        }

        // Call face verification API
        const formData = new FormData();
        formData.append('image1', fs.createReadStream(referenceImagePath));
        formData.append('image2', fs.createReadStream(liveImageFile.path));

        console.log('📡 Calling face verification API...');

        let faceApiResponse;
        try {
            faceApiResponse = await axios.post('http://localhost:5000/verify', formData, {
                headers: formData.getHeaders(),
                timeout: 30000, // 30 seconds timeout
            });
        } catch (apiError) {
            console.error('❌ Face API Error:', apiError.message);
            if (apiError.code === 'ECONNREFUSED') {
                throw new Error(
                    'Face Verification API is not running. Please start it on port 5000.'
                );
            }
            throw new Error(`Face API request failed: ${apiError.message}`);
        }

        console.log('Face API Response:', faceApiResponse.data);

        const { match, confidence } = faceApiResponse.data;
        const verified = match === true;

        // Update verification log — find the most recent one for this candidate
        await InterviewVerification.findOneAndUpdate(
            { candidateId: candidate._id },
            {
                faceVerified: verified,
                confidenceScore: confidence,
                liveImagePath: liveImageFile.path,
                status: verified ? 'verified' : 'failed',
            },
            { sort: { verificationTimestamp: -1 } }
        );

        console.log(
            `${verified ? '✅' : '❌'} Face verification: ${verified ? 'PASSED' : 'FAILED'} (Confidence: ${confidence}%)`
        );

        res.status(200).json({
            success: true,
            verified: verified,
            match: match,
            confidence: confidence,
            message: verified ? 'Face verification successful' : 'Face verification failed',
            candidate: {
                name: candidate.name,
                roll_no: candidate.rollNo,
            },
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
            error: error.message,
        });
    }
});

// GET /candidate/:rfid - Get candidate details (for testing)
router.get('/candidate/:rfid', async (req, res) => {
    try {
        const { rfid } = req.params;

        const candidate = await InterviewCandidate.findOne({ rfid }).select(
            'rfid rollNo name dob referenceImagePath'
        );

        if (!candidate) {
            return res.status(404).json({ message: 'Candidate not found' });
        }

        // Map to match the original SQL response shape
        res.status(200).json({
            id: candidate._id,
            rfid: candidate.rfid,
            roll_no: candidate.rollNo,
            name: candidate.name,
            dob: candidate.dob,
            reference_image_path: candidate.referenceImagePath,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching candidate', error: error.message });
    }
});

// ========================================
// INTERVIEW QUESTION DELIVERY ENDPOINTS
// ========================================

// POST /start-interview - Start interview session and get first question
router.post('/start-interview', authenticateToken, async (req, res) => {
    try {
        const { rfid, roll_no, name, language } = req.body;

        if (!rfid || !roll_no) {
            return res.status(400).json({
                success: false,
                message: 'RFID and Roll No are required',
            });
        }

        // Security check: Verify RFID ownership
        const User = require('../models/User');
        const currentUser = await User.findById(req.user.id);
        if (!currentUser || (currentUser.rfid && currentUser.rfid !== rfid)) {
            return res.status(403).json({
                success: false,
                message: 'Access Denied: This RFID does not belong to your account.',
            });
        }

        console.log(`🎯 Starting interview for: ${name} (${rfid})`);

        // Call NLP Model API to start interview
        const response = await axios.post(`${NLP_API_URL}/start-interview`, {
            rfid,
            roll_no,
            name,
            language: language || 'en',
        });

        console.log(`✅ First question retrieved for ${rfid}`);

        res.status(200).json({
            success: true,
            session_id: response.data.session_id,
            question: response.data.question,
        });
    } catch (error) {
        console.error('Error starting interview:', error.message);

        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                success: false,
                message: 'Question delivery service is unavailable. Please contact administrator.',
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error starting interview',
            error: error.message,
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
                message: 'RFID is required',
            });
        }

        console.log(`📝 Submitting answer for RFID: ${rfid}, Question ID: ${question_id}`);

        // Call NLP Model API to evaluate answer and get next question
        const response = await axios.post(`${NLP_API_URL}/submit-answer`, {
            rfid,
            answer: answer || '',
            question_id,
        });

        const { completed, score, question } = response.data;

        if (completed) {
            console.log(`✅ Interview completed for ${rfid}, Total Score: ${score.total_score}`);

            // Update interview status in database
            const candidate = await InterviewCandidate.findOne({ rfid });
            if (candidate) {
                await InterviewVerification.findOneAndUpdate(
                    { candidateId: candidate._id },
                    { status: 'completed' },
                    { sort: { verificationTimestamp: -1 } }
                );
            }

            return res.status(200).json({
                success: true,
                completed: true,
                score: score,
                message: 'Interview completed successfully',
            });
        }

        console.log(`➡️ Next question for ${rfid}: Q${question.question_number}`);

        res.status(200).json({
            success: true,
            completed: false,
            score: score,
            question: question,
        });
    } catch (error) {
        console.error('Error submitting answer:', error.message);

        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                success: false,
                message: 'Question delivery service is unavailable.',
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error processing answer',
            error: error.message,
        });
    }
});

const InterviewReport = require('../models/InterviewReport');

// POST /complete - Interview completion endpoint
router.post('/complete', authenticateToken, async (req, res) => {
    try {
        const { sessionId, duration, questionsAnswered, language, completedAt, interviewData } =
            req.body;

        console.log(`✅ Interview completion data received for session: ${sessionId}`);
        console.log(
            `Duration: ${duration}s, Questions: ${questionsAnswered}, Language: ${language}`
        );

        // Save report to database
        const newReport = await InterviewReport.create({
            userId: req.user.id, // from authenticateToken
            candidateInfo: interviewData.candidateInfo,
            interviewSession: interviewData.interviewSession,
            questionsAndAnswers: interviewData.questionsAndAnswers
        });

        res.status(200).json({
            success: true,
            message: 'Interview completion data saved successfully',
            sessionId: sessionId,
            reportId: newReport._id
        });
    } catch (error) {
        console.error('Error saving interview completion:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error saving interview data',
            error: error.message,
        });
    }
});

// GET /session-status/:rfid - Get current interview session status
router.get('/session-status/:rfid', async (req, res) => {
    try {
        const { rfid } = req.params;

        const response = await axios.get(`${NLP_API_URL}/get-session`, {
            params: { rfid },
        });

        res.status(200).json(response.data);
    } catch (error) {
        if (error.response?.status === 404) {
            return res.status(404).json({
                success: false,
                message: 'Session not found',
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error fetching session',
            error: error.message,
        });
    }
});

// ═══════════════════════════════════════
// TTS PROXY — Forward to NLP server edge-tts
// ═══════════════════════════════════════
router.post('/tts', async (req, res) => {
    try {
        const { text, language } = req.body;
        const response = await axios.post(`${NLP_API_URL}/tts`, { text, language }, {
            responseType: 'arraybuffer',
            headers: { 'Content-Type': 'application/json' }
        });
        res.set('Content-Type', 'audio/mpeg');
        res.send(Buffer.from(response.data));
    } catch (error) {
        console.error('❌ TTS proxy error:', error.message);
        res.status(500).json({ success: false, message: 'TTS generation failed' });
    }
});

module.exports = router;
