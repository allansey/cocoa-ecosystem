# Transaction Monitoring System — Full Implementation Plan

## What This Fixes & Builds

This plan removes all mock/placeholder elements and replaces them with a **complete transaction lifecycle management system** for every order between a farmer and buyer.

---

## Bugs Being Fixed

> [!WARNING]
> **Critical Bug**: The dashboard uses `'SHIPPED'` but the database schema uses `'IN_TRANSIT'`. The "Mark Shipped" button currently writes an invalid status to the database. This will be corrected everywhere.

> [!IMPORTANT]
> **Mock Payment**: The "Mark as Paid (Mock)" button will be replaced with a proper **Cash on Delivery (COD)** confirmation flow — the buyer confirms they have arranged payment and the farmer confirms receipt of payment before the order proceeds.

---

## Proposed Changes

### 1. 🗄️ Backend — Fix & Strengthen Order Logic

#### [MODIFY] `backend/routes/orders.js`
- Fix default `paymentMethod` to use `'COD'` (Cash on Delivery) since that was the agreed approach
- When an order reaches `COMPLETED`, **auto-mark the listing as `SOLD`**
- Add a new `GET /orders/:id/activity` endpoint that returns a full **activity log** for an order (status changes with timestamps)
- Fix status permission logic to properly gate `PAYMENT_PENDING → PAID` transitions

#### [MODIFY] `backend/prisma/schema.prisma`
- Add a new `OrderActivity` model to log every status change with timestamp, actor, and note

```prisma
model OrderActivity {
  id        String   @id @default(uuid())
  orderId   String
  order     Order    @relation(...)
  actorId   String
  actorName String
  action    String   // e.g. "ACCEPTED", "PAYMENT_CONFIRMED", "DISPUTED"
  note      String?
  createdAt DateTime @default(now())
}
```

---

### 2. 🖥️ Frontend — Full Transaction Dashboard (Order Detail Page Rebuild)

#### [MODIFY] `orders/[id]/page.tsx`
This page will be completely rebuilt into a **4-panel transaction hub**:

**Panel 1 — Order Summary Card**
- Show all order details: grade, quantity, price, total, payment method, dates
- Show `proposedPrice` if the buyer negotiated a price
- Show farmer & buyer contact info with phone number

**Panel 2 — Live Transaction Timeline**
- A vertical activity log showing every action taken on this order with who did it and when
- Uses the new `OrderActivity` backend endpoint
- Real-time feel — refreshes when status changes

**Panel 3 — Action Center (Role-based)**

*For FARMER (what they see and can do at each stage):*
| Order Status | Available Action |
|---|---|
| `PENDING_APPROVAL` | ✅ Accept Order / ❌ Reject Order |
| `PAYMENT_PENDING` | Waiting for buyer payment confirmation |
| `PAID` | ✅ Mark as Dispatched (IN_TRANSIT) |
| `IN_TRANSIT` | ✅ Mark as Delivered |
| Any active | 🚨 Raise Dispute |

*For BUYER (what they see and can do at each stage):*
| Order Status | Available Action |
|---|---|
| `PENDING_APPROVAL` | Waiting for farmer to accept |
| `ACCEPTED` | ✅ Confirm Payment Arranged (→ PAYMENT_PENDING) |
| `PAYMENT_PENDING` | Waiting for farmer to verify payment |
| `IN_TRANSIT` | Tracking info displayed |
| `DELIVERED` | ✅ Confirm Receipt (→ COMPLETED) |
| Any active | 🚨 Raise Dispute |

**Panel 4 — Real-time Chat (Firebase)**
- Keep the existing Firebase chat (already working)
- Remove any leftover mock chat messages from Firebase on page load check

---

### 3. 🖥️ Frontend — Fix Dashboard (`dashboard/page.tsx`)
- Fix `'SHIPPED'` → `'IN_TRANSIT'` everywhere (status colors, icons, button calls)
- Fix buyer "Confirm Delivery" button to use `IN_TRANSIT` status check
- Show richer order cards with the full status label
- Add an **"Orders" quick link** for both farmer and buyer

---

### 4. 🧹 Cleanup
- Remove `"(Mock)"` label from all UI elements
- Remove `PAYMENT_PENDING` being orphaned — give it a proper UI trigger
- Fix hardcoded `http://localhost:5000` image URLs to use an env variable `NEXT_PUBLIC_API_URL`

---

## Verification Plan

### Manual Verification
1. Log in as a Farmer — check dashboard shows correct statuses
2. Log in as a Buyer — place an order, verify the full lifecycle works step by step
3. Verify that completing an order auto-marks the listing as SOLD
4. Verify that raising a dispute shows the correct admin notification UI
5. Confirm Firebase chat still works during the transaction
