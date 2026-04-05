const express = require('express');
const { z } = require('zod');

const validate = require('../middlewares/validate');
const asyncHandler = require('../utils/asyncHandler');
const {
  listStock,
  listProductStock,
  addProductToStock,
  adjustProductStock
} = require('../controllers/stock.controller');

const router = express.Router();

const listSchema = z.object({
  q: z.string().trim().min(1).optional(),
  lowOnly: z.enum(['true', 'false']).optional()
});

const createProductStockSchema = z.object({
  name: z.string().trim().min(2),
  dressCode: z.string().trim().optional().nullable(),
  quantity: z.coerce.number().int().min(0)
});

const productStockQuerySchema = z.object({
  q: z.string().trim().min(1).optional()
});

const adjustProductStockSchema = z.object({
  action: z.enum(['set', 'add', 'remove']),
  quantity: z.coerce.number().int().min(0)
}).refine((value) => value.action === 'set' || value.quantity > 0, {
  message: 'Quantity must be greater than 0 for add/remove',
  path: ['quantity']
});

const idSchema = z.object({ id: z.coerce.number().int().positive() });

router.get('/', validate(listSchema, 'query'), asyncHandler(listStock));
router.get('/products', validate(productStockQuerySchema, 'query'), asyncHandler(listProductStock));
router.post('/products', validate(createProductStockSchema), asyncHandler(addProductToStock));
router.patch('/products/:id', validate(idSchema, 'params'), validate(adjustProductStockSchema), asyncHandler(adjustProductStock));

module.exports = router;
