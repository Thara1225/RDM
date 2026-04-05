const express = require('express');
const { z } = require('zod');

const validate = require('../middlewares/validate');
const asyncHandler = require('../utils/asyncHandler');
const {
  createShopOrder,
  createShopBill,
  listShopOrders,
  getShopOrderById,
  updateShopOrder,
  deleteShopOrder,
  getShopOrdersSummary
} = require('../controllers/shopOrder.controller');

const router = express.Router();

const idSchema = z.object({ id: z.coerce.number().int().positive() });
const shopIdSchema = z.object({ shopId: z.coerce.number().int().positive() });

const createSchema = z.object({
  shopId: z.coerce.number().int().positive(),
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().positive(),
  orderDate: z.string().date(),
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
  notes: z.string().trim().optional().nullable()
});

const updateSchema = z.object({
  quantity: z.coerce.number().int().positive().optional(),
  unitPrice: z.coerce.number().positive().optional(),
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
  notes: z.string().trim().optional().nullable()
});

const listSchema = z.object({
  shopId: z.string().regex(/^\d+$/).optional(),
  productId: z.string().regex(/^\d+$/).optional(),
  billNo: z.string().trim().min(1).optional(),
  fromDate: z.string().date().optional(),
  toDate: z.string().date().optional(),
  status: z.enum(['pending', 'completed', 'cancelled']).optional()
});

const createBillSchema = z.object({
  shopId: z.coerce.number().int().positive(),
  orderDate: z.string().date(),
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
  notes: z.string().trim().optional().nullable(),
  items: z.array(
    z.object({
      productId: z.coerce.number().int().positive(),
      quantity: z.coerce.number().int().positive(),
      unitPrice: z.coerce.number().positive()
    })
  ).min(1)
});

router.post('/', validate(createSchema), asyncHandler(createShopOrder));
router.post('/bill', validate(createBillSchema), asyncHandler(createShopBill));
router.get('/', validate(listSchema, 'query'), asyncHandler(listShopOrders));
router.get('/:id', validate(idSchema, 'params'), asyncHandler(getShopOrderById));
router.put('/:id', validate(idSchema, 'params'), validate(updateSchema), asyncHandler(updateShopOrder));
router.delete('/:id', validate(idSchema, 'params'), asyncHandler(deleteShopOrder));
router.get('/summary/:shopId', validate(shopIdSchema, 'params'), asyncHandler(getShopOrdersSummary));

module.exports = router;
