const express = require('express');
const router = express.Router();
const db = require('../config/database');
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
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate OTP
        const otp = generateOtp();
        console.log(`Generated OTP for ${email}: ${otp}`);

        // Check if user exists
        const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

        if (existingUsers.length > 0) {
            // Update existing user
            await db.query(
                'UPDATE users SET name = ?, password = ?, otp = ?, verified = false WHERE email = ?',
                [name, hashedPassword, otp, email]
            );
        } else {
            // Create new user
            await db.query(
                'INSERT INTO users (name, email, password, otp, verified) VALUES (?, ?, ?, ?, false)',
                [name, email, hashedPassword, otp]
            );
        }

        // Send OTP via email
        const emailSent = await sendOtpEmail(email, otp, name);
        
        if (!emailSent) {
            console.warn('⚠️ Email sending failed, but OTP was generated');
        }

        res.status(200).json({
            message: 'OTP sent successfully',
            otp: otp, // Remove this in production!
            emailSent: emailSent
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
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = users[0];

        // Verify OTP
        if (user.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        // Mark user as verified
        await db.query('UPDATE users SET verified = true WHERE email = ?', [email]);

        // Generate JWT token
        const token = jwt.sign(
            { email: user.email, id: user.id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRATION }
        );

        res.status(200).json({
            token: token,
            name: user.name,
            email: user.email,
            message: 'OTP verified successfully'
        });

    } catch (error) {
        console.error('Error in verifyOtp:', error);
        res.status(500).json({ message: 'Failed to verify OTP', error: error.message });
    }
});

module.exports = router;
