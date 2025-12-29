const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

// Store chat sessions and feedback
// In production, use MongoDB to store chat history
router.post('/', [
  body('messages').isArray().withMessage('Messages must be an array'),
  body('feedback').isObject().withMessage('Feedback is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    const { messages, feedback } = req.body;

    // TODO: Save chat session and feedback to MongoDB
    // const chatSession = new ChatSession({
    //   messages,
    //   feedback,
    //   createdAt: new Date(),
    // });
    // await chatSession.save();

    // Log for now
    console.log('Chat session received:', {
      messageCount: messages.length,
      feedback,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      message: 'Chat feedback submitted successfully',
    });
  } catch (error) {
    console.error('Chat Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit chat feedback',
    });
  }
});

module.exports = router;

