const express = require('express');
const { z } = require('zod');

const validate = require('../middlewares/validate');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middlewares/authMiddleware');
const { login, me, changePassword, changePasswordFromLogin } = require('../controllers/auth.controller');
const { createRateLimiter } = require('../middlewares/rateLimit');

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
  confirmPassword: z.string().min(6)
}).refine((value) => value.newPassword === value.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match'
});

const changePasswordFromLoginSchema = z.object({
  email: z.string().email(),
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
  confirmPassword: z.string().min(6)
}).refine((value) => value.newPassword === value.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match'
});

const loginRateLimiter = createRateLimiter({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 20,
  message: 'Too many login attempts. Please try again later.'
});

router.post('/login', loginRateLimiter, validate(loginSchema), asyncHandler(login));
router.post('/change-password-from-login', loginRateLimiter, validate(changePasswordFromLoginSchema), asyncHandler(changePasswordFromLogin));
router.post('/change-password', requireAuth, validate(changePasswordSchema), asyncHandler(changePassword));
router.get('/me', requireAuth, asyncHandler(me));

module.exports = router;
