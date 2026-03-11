import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/me', authenticate, (req, res) => {
  res.json({
    message: 'Protected route accessed',
    user: req.user,
  });
});

export default router;
