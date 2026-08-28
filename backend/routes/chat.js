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

    // Format timestamp for frontend compatibility
    const formatted = messages.map(m => ({
      ...m,
      timestamp: new Date(m.createdAt).getTime(),
      audioBase64: m.audioUrl
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Server error fetching messages.' });
  }
});

// POST a new message to a specific chat
router.post('/:chatId', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { text, senderName, audioBase64, audioUrl } = req.body;
    const senderId = req.user.userId;

    const audioData = audioBase64 || audioUrl || null;

    if ((!text || !text.trim()) && !audioData) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    const message = await prisma.message.create({
      data: {
        chatId,
        senderId,
        senderName: senderName || req.user.name || 'User',
        text: text ? text.trim() : (audioData ? '🎙️ Voice Note' : ''),
        audioUrl: audioData
      },
    });

    res.status(201).json({
      ...message,
      timestamp: new Date(message.createdAt).getTime(),
      audioBase64: message.audioUrl
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Server error sending message.' });
  }
});

module.exports = router;
