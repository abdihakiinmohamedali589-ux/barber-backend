const nodemailer = require('nodemailer');

// Check if email credentials are provided
const emailUser = process.env.EMAIL_USER;
const emailPassword = process.env.EMAIL_PASSWORD;

// Create email transporter only if credentials are available
let transporter = null;

if (emailUser && emailPassword) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
    tls: {
      // Allow self-signed certificates (needed for some SMTP servers)
      rejectUnauthorized: false,
    },
    // Note: For production, consider using OAuth2 with Gmail
    // For now, using App Password works fine
  });

  // Verify email configuration
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ Email configuration error:', error.message);
      console.warn('⚠️  Email functionality will be disabled. Please check your .env file.');
    } else {
      console.log('✅ Email server is ready to send messages');
    }
  });
} else {
  console.warn('⚠️  Email credentials not found in environment variables.');
  console.warn('⚠️  Please create a .env file with EMAIL_USER and EMAIL_PASSWORD.');
  console.warn('⚠️  Email functionality will be disabled.');
}

// Send OTP email (for authentication)
async function sendOTPEmail(email, otp) {
  if (!transporter) {
    console.error('❌ Email transporter not configured. Please check your .env file.');
    // In development, log the OTP instead
    if (process.env.NODE_ENV === 'development') {
      console.log(`📧 [DEV MODE] OTP for ${email}: ${otp}`);
      return true; // Return true so the app continues to work
    }
    throw new Error('Email service not configured');
  }

  try {
    const mailOptions = {
      from: `"Barber App" <${emailUser}>`,
      to: email,
      subject: 'Your Verification Code - Barber App',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #1E88E5; color: white; padding: 20px; text-align: center;">
            <h1>Barber App</h1>
          </div>
          <div style="padding: 30px; background-color: #f5f5f5;">
            <h2 style="color: #212121;">Verification Code</h2>
            <p style="color: #757575; font-size: 16px;">
              Your verification code is:
            </p>
            <div style="background-color: white; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
              <h1 style="color: #1E88E5; font-size: 36px; letter-spacing: 5px; margin: 0;">
                ${otp}
              </h1>
            </div>
            <p style="color: #757575; font-size: 14px;">
              This code will expire in 10 minutes. Please do not share this code with anyone.
            </p>
            <p style="color: #757575; font-size: 14px; margin-top: 20px;">
              If you didn't request this code, please ignore this email.
            </p>
          </div>
          <div style="background-color: #212121; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Barber App. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `Your verification code is: ${otp}. Valid for 10 minutes.`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    // In development, log the OTP instead of failing
    if (process.env.NODE_ENV === 'development') {
      console.log(`📧 [DEV MODE] OTP for ${email}: ${otp}`);
      return true;
    }
    throw error;
  }
}

// Send custom email (for notifications, feedback, etc.)
async function sendCustomEmail(email, subject, htmlContent) {
  if (!transporter) {
    console.error('❌ Email transporter not configured. Please check your .env file.');
    console.log(`📧 [DEV MODE] Would send email to ${email} with subject: ${subject}`);
    return true; // Return true so the app continues to work
  }

  try {
    const textContent = htmlContent.replace(/<[^>]*>/g, ''); // Strip HTML tags for text version
    
    const mailOptions = {
      from: `"Barber App" <${emailUser}>`,
      to: email,
      subject: subject,
      html: htmlContent,
      text: textContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    // In development, don't fail completely
    if (process.env.NODE_ENV === 'development') {
      console.log(`📧 [DEV MODE] Would send email to ${email}`);
      return true;
    }
    throw error;
  }
}

module.exports = {
  sendOTPEmail,
  sendCustomEmail,
};
