import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { verifyPaymentSchema } from '../validators/orderValidator.js';
import * as paymentController from '../controllers/paymentController.js';

const router = express.Router();

// Initialize Razorpay order for an existing pending order
router.post('/create-order', authenticate, paymentController.createRazorpayOrder);

// Verify payment signature after client Razorpay checkout completes
router.post(
  '/verify-signature',
  authenticate,
  validateRequest({ body: verifyPaymentSchema }),
  paymentController.verifyPaymentSignature
);

// Gateway webhook endpoint (verified via HMAC signature on raw body)
router.post('/webhook', paymentController.handleWebhook);

export default router;
