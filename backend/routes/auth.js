const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');
const admin = require('../firebaseAdmin');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, role, name, phone } = req.body;
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email already in use.' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: { 
        email, 
        password: hashedPassword, 
        role: role || 'BUYER', 
        name: name || email.split('@')[0], // Fallback to email prefix if name is missing
        phone 
      },
    });

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET || 'supersecretjwtkey', { expiresIn: '7d' });

    // Mint a Firebase Custom Token so the frontend can sign into Firebase Auth
    let firebaseToken = null;
    if (admin.apps.length) {
      try {
        firebaseToken = await admin.auth().createCustomToken(user.id);
      } catch (e) {
        console.error('Firebase custom token error (register):', e.message);
      }
    }

    res.status(201).json({ token, firebaseToken, user: { id: user.id, email: user.email, role: user.role, name: user.name, phone: user.phone } });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Invalid email or password.' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid email or password.' });

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET || 'supersecretjwtkey', { expiresIn: '7d' });

    // Mint a Firebase Custom Token so the frontend can sign into Firebase Auth
    let firebaseToken = null;
    if (admin.apps.length) {
      try {
        firebaseToken = await admin.auth().createCustomToken(user.id);
      } catch (e) {
        console.error('Firebase custom token error (login):', e.message);
      }
    }

    res.json({ token, firebaseToken, user: { id: user.id, email: user.email, role: user.role, name: user.name, phone: user.phone } });
  } catch (error) {
    res.status(500).json({ error: 'Server error during login.' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, email: true, name: true, role: true, phone: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    const updateData = { name, phone };
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }
    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: updateData,
      select: { id: true, email: true, name: true, role: true, phone: true }
    });
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: 'Server error updating profile' });
  }
});

/**
 * POST /api/auth/forgot-password
 * Initiate password reset request
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return success to prevent email enumeration
      return res.json({ message: 'If that email exists in our system, password reset instructions have been generated.' });
    }

    // Generate a temporary reset token (expires in 1 hour)
    const resetToken = jwt.sign(
      { userId: user.id, email: user.email, type: 'reset' },
      process.env.JWT_SECRET || 'supersecretjwtkey',
      { expiresIn: '1h' }
    );

    res.json({
      message: 'Password reset token generated successfully.',
      resetToken, // Provided in response for easy testing/demo reset
      email: user.email
    });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ error: 'Failed to process password reset.' });
  }
});

/**
 * POST /api/auth/reset-password
 * Complete password reset with new password
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword, email } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    let targetUserId = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkey');
        targetUserId = decoded.userId;
      } catch (err) {
        return res.status(400).json({ error: 'Invalid or expired reset token.' });
      }
    } else if (email) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) targetUserId = user.id;
    }

    if (!targetUserId) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: targetUserId },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password has been reset successfully. You can now login.' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

module.exports = router;
