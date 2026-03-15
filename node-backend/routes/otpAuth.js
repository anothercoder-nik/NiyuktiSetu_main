const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { sendOtpEmail } = require('../utils/emailService');
require('dotenv').config();

// Generate 6-digit OTP
const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// POST /otp-auth/send - Send OTP for registration
router.post('/send', async (req, res) => {
    try {
        console.log('=== OTP SEND REQUEST RECEIVED ===');
        const { name, email, password, rfid } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate OTP
        const otp = generateOtp();
        console.log(`Generated OTP for ${email}: ${otp}`);

        // Check if user exists
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            // Update existing user
            const updateProps = { name, password: hashedPassword, otp, verified: false };
            if (rfid) updateProps.rfid = rfid;

            await User.findOneAndUpdate(
                { email },
                updateProps
            );
        } else {
            // Create new user
            const createProps = {
                name,
                email,
                password: hashedPassword,
                otp,
                verified: false,
            };
            if (rfid) createProps.rfid = rfid;

            await User.create(createProps);
        }

        // Send OTP via email
        const emailSent = await sendOtpEmail(email, otp, name);

        if (!emailSent) {
            console.warn('⚠️ Email sending failed, but OTP was generated');
        }

        res.status(200).json({
            message: 'OTP sent successfully',
            emailSent: emailSent,
        });
    } catch (error) {
        console.error('Error in sendOtp:', error);
        res.status(500).json({ message: 'Failed to send OTP', error: error.message });
    }
});

// POST /otp-auth/verify - Verify OTP and login
router.post('/verify', async (req, res) => {
    try {
        console.log('=== OTP VERIFY REQUEST RECEIVED ===');
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required' });
        }

        // Find user
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify OTP
        if (user.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        // Mark user as verified
        await User.findOneAndUpdate({ email }, { verified: true });

        // Generate JWT token
        const token = jwt.sign(
            { email: user.email, id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRATION }
        );

        res.status(200).json({
            token: token,
            name: user.name,
            email: user.email,
            message: 'OTP verified successfully',
        });
    } catch (error) {
        console.error('Error in verifyOtp:', error);
        res.status(500).json({ message: 'Failed to verify OTP', error: error.message });
    }
});

// POST /otp-auth/login - Login with email and password
router.post('/login', async (req, res) => {
    try {
        console.log('=== LOGIN REQUEST RECEIVED ===');
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Find user
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { email: user.email, id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRATION }
        );

        res.status(200).json({
            token: token,
            id: user._id,
            name: user.name,
            email: user.email,
            message: 'Logged in successfully',
            verified: user.verified
        });
    } catch (error) {
        console.error('Error in standard login:', error);
        res.status(500).json({ message: 'Login failed', error: error.message });
    }
});

module.exports = router;
