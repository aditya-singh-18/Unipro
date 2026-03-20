import express from 'express';
import {
	forgotPassword,
	login,
	logout,
	resetPassword,
	verifyEmail,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { forgotPasswordLimiter } from '../middlewares/rateLimit.middleware.js';

const router = express.Router();

router.post('/login', login);
router.post('/logout', authenticate, logout);
router.get('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
