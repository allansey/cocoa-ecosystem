const express = require('express');
const axios = require('axios');
const prisma = require('../prismaClient');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_mock_key';

// INITIALIZE a transaction
router.post('/initialize', authMiddleware, async (req, res) => {
  try {
    const { orderId, amount, email } = req.body;

    // In a real scenario, you'd call Paystack API here
    /*
    const response = await axios.post('https://api.paystack.co/transaction/initialize', {
      email,
      amount: amount * 100, // Paystack expects amount in pesewas
      metadata: { orderId }
    }, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` }
    });
    return res.json(response.data);
    */

    // Mocking Paystack response for MVP
    res.json({
      status: true,
      message: "Authorization URL generated",
      data: {
        authorization_url: "https://checkout.paystack.com/mock_checkout",
        access_code: "mock_code",
        reference: `ref_${Date.now()}`
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Payment initialization failed.' });
  }
});

// WEBHOOK to handle payment confirmation
router.post('/webhook', async (req, res) => {
  // In reality, you'd verify the Paystack signature here
  const event = req.body;

  if (event.event === 'charge.success') {
    const orderId = event?.data?.metadata?.orderId;
    if (orderId) {
      try {
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'PAID' }
        });
      } catch (error) {
        console.error('Webhook update failed:', error);
      }
    } else {
      console.warn('Webhook received charge.success without orderId metadata');
    }
  }

  res.sendStatus(200);
});

module.exports = router;
