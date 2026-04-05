const express = require('express');
const { z } = require('zod');

const validate = require('../middlewares/validate');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/supplier.controller');

const router = express.Router();

const idSchema = z.object({ id: z.coerce.number().int().positive() });
const querySchema = z.object({
  q: z.string().trim().min(1).optional(),
  fromDate: z.string().date().optional(),
  toDate: z.string().date().optional(),
  sortBy: z.enum(['name', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

const purchasesQuerySchema = z.object({
  fromDate: z.string().date().optional(),
  toDate: z.string().date().optional(),
  materialId: z.string().regex(/^\d+$/).optional()
});

const createSchema = z.object({
  name: z.string().trim().min(2),
  phone: z.string().trim().min(3).max(30).optional().nullable(),
  address: z.string().trim().min(2).optional().nullable(),
  notes: z.string().trim().optional().nullable()
});

const updateSchema = createSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required for update'
});

router.post('/', validate(createSchema), asyncHandler(controller.createSupplier));
router.get('/', validate(querySchema, 'query'), asyncHandler(controller.listSuppliers));
router.get('/:id', validate(idSchema, 'params'), asyncHandler(controller.getSupplierById));
router.get(
  '/:id/purchases',
  validate(idSchema, 'params'),
  validate(purchasesQuerySchema, 'query'),
  asyncHandler(controller.listSupplierPurchases)
);
router.put('/:id', validate(idSchema, 'params'), validate(updateSchema), asyncHandler(controller.updateSupplier));
router.delete('/:id', validate(idSchema, 'params'), asyncHandler(controller.deleteSupplier));

module.exports = router;
