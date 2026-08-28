const express = require('express');
const axios = require('axios');
const prisma = require('../prismaClient');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// Helper: log an activity entry for an order
async function logActivity(orderId, actorId, actorName, actorRole, action, note = null) {
  try {
    await prisma.orderActivity.create({
      data: { orderId, actorId, actorName, actorRole, action, note }
    });
  } catch (e) {
    console.error('Failed to log activity:', e.message);
  }
}

/**
 * POST /api/payment/initialize
 * Initialize a Mobile Money / Paystack transaction
 */
router.post('/initialize', authMiddleware, async (req, res) => {
  try {
    const { orderId, amount, email } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({ error: 'Missing mandatory orderId or amount.' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { buyer: true }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // If real Paystack secret key is configured in env
    if (PAYSTACK_SECRET_KEY && !PAYSTACK_SECRET_KEY.includes('mock')) {
      try {
        const response = await axios.post(
          'https://api.paystack.co/transaction/initialize',
          {
            email: email || order.buyer.email,
            amount: Math.round(amount * 100), // Paystack expects amount in pesewas (GHS * 100)
            metadata: { orderId: order.id, buyerId: order.buyerId }
          },
          {
            headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` }
          }
        );
        return res.json(response.data);
      } catch (paystackErr) {
        console.error('[Paystack API Error]:', paystackErr.response?.data || paystackErr.message);
        return res.status(502).json({
          error: 'Paystack Gateway failed to initialize.',
          details: paystackErr.response?.data?.message || paystackErr.message
        });
      }
    }

    // Interactive Mobile Money Sandbox Simulation
    const reference = `REF_MOMO_${Date.now()}`;
    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol || 'http';
    const sandboxUrl = `${protocol}://${host}/api/payment/sandbox-checkout/${order.id}?ref=${reference}`;

    res.json({
      status: true,
      message: 'Mobile Money Gateway Initialized (Sandbox Mode)',
      data: {
        authorization_url: sandboxUrl,
        access_code: `momo_access_${Date.now()}`,
        reference
      }
    });

  } catch (error) {
    console.error('[Payment Init Error]:', error);
    res.status(500).json({ error: 'Payment initialization failed due to server error.' });
  }
});

/**
 * GET /api/payment/sandbox-checkout/:orderId
 * Interactive MoMo Sandbox Gateway Simulation UI
 */
router.get('/sandbox-checkout/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { ref: reference } = req.query;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { listing: true, buyer: true, farmer: true }
    });

    if (!order) {
      return res.status(404).send('<h2>Order not found</h2>');
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Mobile Money Payment Gateway (Sandbox)</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; display: flex; align-items: center; justify-content: center; min-h: 100vh; margin: 0; padding: 20px; }
          .card { background: white; border-radius: 24px; padding: 32px; max-width: 440px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; text-align: center; }
          .badge { background: #fef3c7; color: #92400e; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 4px 12px; border-radius: 9999px; letter-spacing: 1px; display: inline-block; margin-bottom: 12px; }
          h2 { margin: 0 0 8px; font-size: 22px; font-weight: 900; }
          p { font-size: 14px; color: #64748b; margin: 0 0 20px; }
          .box { background: #f1f5f9; border-radius: 16px; padding: 16px; margin-bottom: 24px; text-align: left; font-size: 13px; border: 1px solid #e2e8f0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .row:last-child { margin-bottom: 0; border-top: 1px solid #cbd5e1; padding-top: 8px; font-weight: 800; font-size: 15px; color: #059669; }
          .btn-success { background: #059669; color: white; border: none; width: 100%; padding: 14px; border-radius: 14px; font-weight: 800; font-size: 14px; cursor: pointer; margin-bottom: 10px; transition: all 0.2s; }
          .btn-success:hover { background: #047857; }
          .btn-danger { background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; width: 100%; padding: 12px; border-radius: 14px; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.2s; }
          .btn-danger:hover { background: #e2e8f0; color: #334155; }
        </style>
      </head>
      <body>
        <div class="card">
          <span class="badge">📱 MoMo Paystack Sandbox</span>
          <h2>Confirm Mobile Money Prompt</h2>
          <p>Simulating push notification on Ghana MoMo network (MTN / Vodafone / Telecel)</p>
          
          <div class="box">
            <div class="row"><span>Order Ref:</span> <span>#${order.id.slice(0,8).toUpperCase()}</span></div>
            <div class="row"><span>Cocoa Grade:</span> <span>Grade ${order.listing.grade} (${order.quantityKg}kg)</span></div>
            <div class="row"><span>Buyer:</span> <span>${order.buyer.name || order.buyer.email}</span></div>
            <div class="row"><span>Total Amount:</span> <span>GHS ${order.totalAmount.toLocaleString()}</span></div>
          </div>

          <form action="/api/payment/sandbox-confirm" method="POST">
            <input type="hidden" name="orderId" value="${order.id}">
            <input type="hidden" name="action" value="APPROVE">
            <button type="submit" class="btn-success">✓ Authorize GHS ${order.totalAmount.toLocaleString()} Payment</button>
          </form>

          <form action="/api/payment/sandbox-confirm" method="POST">
            <input type="hidden" name="orderId" value="${order.id}">
            <input type="hidden" name="action" value="CANCEL">
            <button type="submit" class="btn-danger">✕ Cancel Transaction</button>
          </form>
        </div>
      </body>
      </html>
    `;
    res.send(html);
  } catch (err) {
    res.status(500).send('Sandbox error: ' + err.message);
  }
});

/**
 * POST /api/payment/sandbox-confirm
 * Handle Sandbox MoMo Authorization Approval or Cancellation
 */
router.post('/sandbox-confirm', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const { orderId, action } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { buyer: true }
    });

    if (!order) {
      return res.status(404).send('Order not found');
    }

    if (action === 'APPROVE') {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'PAID' }
      });

      await logActivity(
        orderId,
        order.buyerId,
        order.buyer.name || order.buyer.email,
        'BUYER',
        'PAID',
        `Mobile Money payment of GHS ${order.totalAmount.toLocaleString()} authorized via Paystack gateway.`
      );

      // Redirect back to order detail page on frontend
      return res.redirect(`http://localhost:3000/en/orders/${orderId}?payment=success`);
    } else {
      await logActivity(
        orderId,
        order.buyerId,
        order.buyer.name || order.buyer.email,
        'BUYER',
        'PAYMENT_PENDING',
        'Mobile Money transaction was cancelled by user at prompt.'
      );

      return res.redirect(`http://localhost:3000/en/orders/${orderId}?payment=cancelled`);
    }
  } catch (err) {
    console.error('[Sandbox Confirm Error]:', err);
    res.status(500).send('Error processing payment confirmation');
  }
});

/**
 * POST /api/payment/verify
 * Verify payment status for an order
 */
router.get('/verify/:orderId', authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    res.json({
      orderId: order.id,
      status: order.status,
      paid: order.status === 'PAID' || order.status === 'IN_TRANSIT' || order.status === 'DELIVERED' || order.status === 'COMPLETED'
    });
  } catch (err) {
    res.status(500).json({ error: 'Error verifying payment.' });
  }
});

/**
 * POST /api/payment/webhook
 * Paystack Webhook
 */
router.post('/webhook', async (req, res) => {
  const event = req.body;
  if (event?.event === 'charge.success') {
    const orderId = event?.data?.metadata?.orderId;
    if (orderId) {
      try {
        const order = await prisma.order.update({
          where: { id: orderId },
          data: { status: 'PAID' }
        });
        await logActivity(
          orderId,
          order.buyerId,
          'Paystack Webhook',
          'SYSTEM',
          'PAID',
          `Payment verified via Paystack charge.success webhook event (${event.data.reference}).`
        );
      } catch (error) {
        console.error('[Paystack Webhook Update Error]:', error);
      }
    }
  }
  res.sendStatus(200);
});

module.exports = router;
