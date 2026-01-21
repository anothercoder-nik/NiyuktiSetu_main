// Test email configuration
require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    debug: true, // Enable debug output
    logger: true // Log to console
});

async function testEmail() {
    console.log('🔧 Testing email configuration...\n');
    console.log('Host:', process.env.EMAIL_HOST);
    console.log('Port:', process.env.EMAIL_PORT);
    console.log('User:', process.env.EMAIL_USER);
    console.log('From:', process.env.EMAIL_FROM);
    console.log('\n📧 Sending test email...\n');

    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: process.env.EMAIL_USER, // Send to yourself
            subject: 'NiyuktiSetu Email Test',
            html: `
                <h2>Email Configuration Test</h2>
                <p>If you received this, your email configuration is working! ✅</p>
                <p>Test OTP: <strong>123456</strong></p>
                <p>Timestamp: ${new Date().toLocaleString()}</p>
            `
        });

        console.log('✅ Email sent successfully!');
        console.log('Message ID:', info.messageId);
        console.log('\n✨ Configuration is working! You should receive the test email shortly.\n');
    } catch (error) {
        console.error('❌ Email sending failed:');
        console.error('Error:', error.message);
        console.error('\n💡 Possible solutions:');
        console.error('1. Check if the email/password are correct');
        console.error('2. Enable "Less secure app access" or use App Password');
        console.error('3. Check if institutional email allows SMTP');
        console.error('4. Try using a personal Gmail account instead\n');
    }
}

testEmail();
