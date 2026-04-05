const express = require('express');
const { z } = require('zod');

const validate = require('../middlewares/validate');
const asyncHandler = require('../utils/asyncHandler');
const {
  createShopPayment,
  listShopPayments,
  getShopPaymentById,
  updateShopPayment,
  deleteShopPayment,
  getShopAccountsSummary
} = require('../controllers/shopPayment.controller');

const router = express.Router();

const createSchema = z.object({
  shopId: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive(),
  paymentDate: z.string().date(),
  description: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable()
});

const updateSchema = z.object({
  shopId: z.coerce.number().int().positive().optional(),
  amount: z.coerce.number().positive().optional(),
  paymentDate: z.string().date().optional(),
  description: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable()
});

const listSchema = z.object({
  shopId: z.string().regex(/^\d+$/).optional()
});

router.post('/', validate(createSchema), asyncHandler(createShopPayment));
router.get('/summary', asyncHandler(getShopAccountsSummary));
router.get('/', validate(listSchema, 'query'), asyncHandler(listShopPayments));
router.get('/:id', asyncHandler(getShopPaymentById));
router.put('/:id', validate(updateSchema), asyncHandler(updateShopPayment));
router.delete('/:id', asyncHandler(deleteShopPayment));

module.exports = router;
