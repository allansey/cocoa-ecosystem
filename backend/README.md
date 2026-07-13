# Backend Setup

This backend uses Express and Prisma. To run it locally:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Generate the Prisma client:
   ```bash
   npm run generate
   ```

3. Copy `.env.example` to `.env` and fill in your values.

4. Start the server:
   ```bash
   npm start
   ```

## Notes

- The backend requires `DATABASE_URL` to connect to PostgreSQL.
- `JWT_SECRET` is used for authentication token signing.
- `PAYSTACK_SECRET_KEY`, `FIREBASE_SERVICE_ACCOUNT`, and `FIREBASE_DATABASE_URL` are optional for payment and IoT features.
- A basic health check is available at `/api/health`.
