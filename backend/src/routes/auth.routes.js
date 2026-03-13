import express from 'express';
import { login } from '../controllers/auth.controller.js';
import { authLimiter } from '../middlewares/rateLimit.middleware.js';

const router = express.Router();

// Brute-force protection: max 10 attempts / 15 min per IP
router.post('/login', authLimiter, login);

export default router;
