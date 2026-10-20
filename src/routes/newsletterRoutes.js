import express from 'express';
import { z } from 'zod';
import { validateRequest } from '../middlewares/validateRequest.js';
import { sendResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { User } from '../models/User.js';

const router = express.Router();

const subscribeSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address.')
}).strict();

router.post(
  '/subscribe',
  validateRequest({ body: subscribeSchema }),
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase();

    // If an existing registered patron subscribes, update their profile preferences
    const user = await User.findOne({ email: normalizedEmail });
    if (user) {
      if (!user.preferences) user.preferences = {};
      user.preferences.newsletter = true;
      await user.save();
    }

    sendResponse(res, {
      message: 'You have been granted confidential access to the AUREVÉ Private Vault newsletter.',
      data: {
        email: normalizedEmail,
        subscribedAt: new Date().toISOString()
      }
    });
  })
);

export default router;
