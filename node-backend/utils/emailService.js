const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

const sendOtpEmail = async (email, otp, name) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Your OTP for NiyuktiSetu Registration',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Welcome to NiyuktiSetu!</h2>
                    <p>Hi ${name},</p>
                    <p>Your OTP for registration is:</p>
                    <h1 style="color: #4CAF50; font-size: 36px; letter-spacing: 5px;">${otp}</h1>
                    <p>This OTP is valid for 10 minutes.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                    <br>
                    <p>Best regards,<br>NiyuktiSetu Team</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('❌ Email sending failed:', error.message);
        return false;
    }
};

module.exports = { sendOtpEmail };
