const express = require('express');
const prisma = require('../prismaClient');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET messages for a specific chat
router.get('/:chatId', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    
    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
    });

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Server error fetching messages.' });
  }
});

// POST a new message to a specific chat
router.post('/:chatId', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { text, senderName } = req.body;
    const senderId = req.user.userId;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Message text cannot be empty.' });
    }

    const message = await prisma.message.create({
      data: {
        chatId,
        senderId,
        senderName: senderName || 'User',
        text: text.trim(),
      },
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Server error sending message.' });
  }
});

module.exports = router;
