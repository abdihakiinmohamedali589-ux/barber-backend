const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

// Store feedback in memory (in production, use MongoDB)
// For now, we'll just log it and send email notification
const { sendCustomEmail } = require('../utils/emailService');

// Submit feedback/contact form
router.post('/', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('message').notEmpty().withMessage('Message is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    const { name, email, message } = req.body;

    // Send notification email to admin
    try {
      const adminEmail = process.env.ADMIN_EMAIL || 'sabrinaibraahiimidow@gmail.com';
      await sendCustomEmail(
        adminEmail,
        `New Feedback from ${name}`,
        `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #1E88E5; color: white; padding: 20px; text-align: center;">
              <h1>New Feedback Received</h1>
            </div>
            <div style="padding: 30px; background-color: #f5f5f5;">
              <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 10px 0;"><strong>Name:</strong> ${name}</p>
                <p style="margin: 10px 0;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 10px 0;"><strong>Message:</strong></p>
                <p style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin-top: 10px; border-left: 4px solid #1E88E5;">
                  ${message.replace(/\n/g, '<br>')}
                </p>
              </div>
            </div>
            <div style="background-color: #212121; color: white; padding: 15px; text-align: center; font-size: 12px;">
              <p>© ${new Date().getFullYear()} Barber App. All rights reserved.</p>
            </div>
          </div>
        `
      );
    } catch (emailError) {
      console.error('Error sending feedback email:', emailError);
      // Don't fail the request if email fails
    }

    // TODO: Save to MongoDB if needed
    // const feedback = new Feedback({ name, email, message });
    // await feedback.save();

    res.json({
      success: true,
      message: 'Thank you for your feedback! We will get back to you soon.',
    });
  } catch (error) {
    console.error('Feedback Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
    });
  }
});

module.exports = router;

