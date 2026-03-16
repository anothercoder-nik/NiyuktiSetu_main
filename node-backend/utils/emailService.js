const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendOtpEmail = async (email, otp, name) => {
  try {
    const currentYear = new Date().getFullYear();
    const timestamp = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const otpDigits = otp.split('').map((digit, i) => `
            <td align="center" style="
                width: 46px;
                height: 56px;
                background-color: #ffffff;
                border: 2px solid #c9a84c;
                border-radius: 10px;
                font-size: 28px;
                font-weight: 800;
                color: #0c1f3f;
                font-family: 'Courier New', Courier, monospace;
                letter-spacing: 0;
                ${i < otp.length - 1 ? 'margin-right: 6px;' : ''}
                box-shadow: 0 2px 8px rgba(12,31,63,0.10);
            ">${digit}</td>
            ${i < otp.length - 1 ? '<td style="width:8px;"></td>' : ''}
        `).join('');

    const mailOptions = {
      from: `"NiyuktiSetu — Govt. of India" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: `OTP: ${otp} | NiyuktiSetu Identity Verification — Government of India`,
      html: `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NiyuktiSetu OTP Verification</title>
</head>
<body style="margin:0; padding:0; background-color:#e8ecf1; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#e8ecf1; padding: 40px 16px;">
    <tr>
      <td align="center">

        <!-- Pre-header text (hidden, for email clients) -->
        <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">
          Your NiyuktiSetu verification code is ${otp}. Valid for 10 minutes.
        </div>

        <!-- Main card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color:#ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 40px rgba(12,31,63,0.12), 0 1px 3px rgba(0,0,0,0.06);">

          <!-- ===== TRICOLOR TOP BAR ===== -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="height:5px; background-color:#FF9933; width:33.33%;"></td>
                  <td style="height:5px; background-color:#FFFFFF; width:33.33%;"></td>
                  <td style="height:5px; background-color:#138808; width:33.33%;"></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ===== HEADER WITH EMBLEM ===== -->
          <tr>
            <td style="background: linear-gradient(180deg, #091428 0%, #0f2440 50%, #132d52 100%); padding: 32px 40px 28px; text-align: center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td align="center">
                    <!-- Emblem container -->
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 16px;">
                      <tr>
                        <td align="center" style="
                          width: 72px;
                          height: 72px;
                          border-radius: 50%;
                          background: linear-gradient(145deg, #c9a84c 0%, #e8d48b 50%, #c9a84c 100%);
                          box-shadow: 0 0 0 3px rgba(201,168,76,0.25), 0 4px 16px rgba(0,0,0,0.3);
                        ">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td align="center" style="
                                width: 62px;
                                height: 62px;
                                border-radius: 50%;
                                background-color: #0c1f3f;
                                border: 2px solid #c9a84c;
                              ">
                                <!-- Lion Capital / Ashoka inspired -->
                                <span style="font-size: 32px; line-height: 62px; color: #c9a84c;">&#9784;</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 4px; text-transform: uppercase;">NIYUKTISETU</h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 6px;">
                    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                      <td style="width:28px; height:1px; background-color:#c9a84c;"></td>
                      <td style="padding: 0 10px;"><span style="color:#c9a84c; font-size:10px;">★</span></td>
                      <td style="width:28px; height:1px; background-color:#c9a84c;"></td>
                    </tr></table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 8px;">
                    <p style="margin:0; color:#8fa4c4; font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase; font-weight: 500;">National Defence Academy</p>
                    <p style="margin:3px 0 0; color:#5d7aa3; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase;">Ministry of Defence &bull; Government of India</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ===== CLASSIFICATION BAR ===== -->
          <tr>
            <td style="background-color: #0a1929; padding: 8px 40px; text-align: center; border-top: 1px solid #1a3a5c; border-bottom: 1px solid #1a3a5c;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="padding-right: 8px;"><span style="color:#3b82f6; font-size:13px;">&#128274;</span></td>
                  <td><p style="margin:0; color:#60a5fa; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">Secure Communication &mdash; Authorized Personnel Only</p></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ===== BODY CONTENT ===== -->
          <tr>
            <td style="padding: 36px 40px 12px;">
              <p style="margin: 0 0 4px; color: #0c1f3f; font-size: 17px; font-weight: 700;">Dear ${name},</p>
              <p style="margin: 0 0 28px; color: #4b5e78; font-size: 14px; line-height: 1.7;">
                A One-Time Password has been generated for your <strong style="color:#0c1f3f;">NiyuktiSetu</strong> identity verification. Enter this code to complete your authentication.
              </p>
            </td>
          </tr>

          <!-- ===== OTP CODE BOX ===== -->
          <tr>
            <td style="padding: 0 40px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="
                background: linear-gradient(135deg, #091428 0%, #0f2440 60%, #152e54 100%);
                border-radius: 14px;
                border: 1px solid #1e3a5f;
                box-shadow: 0 4px 20px rgba(12,31,63,0.18);
              ">
                <tr>
                  <td style="padding: 28px 24px 10px; text-align: center;">
                    <p style="margin: 0; color: #7b9bc5; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; font-weight: 600;">Verification Code</p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 14px 24px 12px;">
                    <!-- Individual digit boxes -->
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                      <tr>
                        ${otpDigits}
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 24px 24px; text-align: center;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                      <tr>
                        <td style="padding-right: 6px;"><span style="font-size: 12px;">&#9201;</span></td>
                        <td><p style="margin: 0; color: #c9a84c; font-size: 12px; font-weight: 600; letter-spacing: 0.5px;">Expires in 10 minutes</p></td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ===== SECURITY ADVISORY ===== -->
          <tr>
            <td style="padding: 0 40px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="
                background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
                border-left: 4px solid #d97706;
                border-radius: 0 10px 10px 0;
                overflow: hidden;
              ">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: top; padding-right: 10px; padding-top: 1px;">
                          <span style="font-size: 16px;">&#9888;&#65039;</span>
                        </td>
                        <td>
                          <p style="margin: 0 0 4px; color: #92400e; font-size: 13px; font-weight: 700;">Security Advisory</p>
                          <p style="margin: 0; color: #a16207; font-size: 12px; line-height: 1.6;">
                            This code is <strong>strictly confidential</strong>. Do NOT share it with anyone — including government officials or NiyuktiSetu personnel. We will never request your OTP via phone, SMS, or email.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ===== REQUEST DETAILS TABLE ===== -->
          <tr>
            <td style="padding: 0 40px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                overflow: hidden;
              ">
                <tr>
                  <td colspan="2" style="background-color: #f1f5f9; padding: 10px 18px; border-bottom: 1px solid #e2e8f0;">
                    <p style="margin:0; color:#475569; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">Request Details</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 11px 18px; border-bottom: 1px solid #f1f5f9; width: 40%; vertical-align: top;">
                    <p style="margin:0; color:#94a3b8; font-size: 12px;">Timestamp (IST)</p>
                  </td>
                  <td style="padding: 11px 18px; border-bottom: 1px solid #f1f5f9;">
                    <p style="margin:0; color:#1e293b; font-size: 12px; font-weight: 600;">${timestamp}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 11px 18px; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                    <p style="margin:0; color:#94a3b8; font-size: 12px;">Recipient</p>
                  </td>
                  <td style="padding: 11px 18px; border-bottom: 1px solid #f1f5f9;">
                    <p style="margin:0; color:#1e293b; font-size: 12px; font-weight: 600;">${email}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 11px 18px; vertical-align: top;">
                    <p style="margin:0; color:#94a3b8; font-size: 12px;">Purpose</p>
                  </td>
                  <td style="padding: 11px 18px;">
                    <p style="margin:0; color:#1e293b; font-size: 12px; font-weight: 600;">Account Verification</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ===== HELP TEXT ===== -->
          <tr>
            <td style="padding: 0 40px 28px;">
              <p style="margin:0; color:#94a3b8; font-size: 12px; line-height: 1.6; text-align: center;">
                If you did not initiate this request, please disregard this email.<br/>Your account remains secure.
              </p>
            </td>
          </tr>

          <!-- ===== DIVIDER ===== -->
          <tr>
            <td style="padding: 0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td style="height:1px; background: linear-gradient(90deg, transparent, #cbd5e1, transparent);"></td>
              </tr></table>
            </td>
          </tr>

          <!-- ===== FOOTER ===== -->
          <tr>
            <td style="padding: 24px 40px 20px; text-align: center;">
              <!-- Mini emblem -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 10px;">
                <tr>
                  <td align="center" style="width:28px; height:28px; border-radius:50%; background-color:#f1f5f9; border:1px solid #e2e8f0;">
                    <span style="font-size:14px; line-height:28px; color:#64748b;">&#9784;</span>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 3px; color: #64748b; font-size: 11px; font-weight: 600;">NiyuktiSetu</p>
              <p style="margin: 0 0 3px; color: #94a3b8; font-size: 10px;">AI-Powered Recruitment Platform &bull; National Defence Academy</p>
              <p style="margin: 0 0 12px; color: #94a3b8; font-size: 10px;">Ministry of Defence, Government of India</p>
              <p style="margin: 0; color: #cbd5e1; font-size: 9px;">&copy; ${currentYear} NiyuktiSetu. All rights reserved. This is a system-generated communication.</p>
            </td>
          </tr>

          <!-- ===== TRICOLOR BOTTOM BAR ===== -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="height:5px; background-color:#FF9933; width:33.33%;"></td>
                  <td style="height:5px; background-color:#FFFFFF; width:33.33%;"></td>
                  <td style="height:5px; background-color:#138808; width:33.33%;"></td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
            `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ OTP email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    return false;
  }
};

module.exports = { sendOtpEmail };
