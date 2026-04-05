const express = require('express');
const { z } = require('zod');

const validate = require('../middlewares/validate');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { upload } = require('../middlewares/upload');
const { createPurchase, listPurchases, updatePurchase, deletePurchase } = require('../controllers/purchase.controller');

const router = express.Router();

const createSchema = z.object({
  supplierId: z.coerce.number().int().positive().optional(),
  materialId: z.coerce.number().int().positive().optional(),
  itemName: z.string().trim().min(2).max(180).optional(),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().positive(),
  purchaseDate: z.string().date(),
  notes: z.string().trim().optional().nullable()
}).superRefine((value, ctx) => {
  if (!value.materialId && !value.itemName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['itemName'],
      message: 'Material or item name is required'
    });
  }
});

const listSchema = z.object({
  supplierId: z.string().regex(/^\d+$/).optional(),
  materialId: z.string().regex(/^\d+$/).optional(),
  scope: z.enum(['all', 'standalone', 'material']).optional(),
  fromDate: z.string().date().optional(),
  toDate: z.string().date().optional()
});

const idSchema = z.object({ id: z.coerce.number().int().positive() });

const updateSchema = z.object({
  itemName: z.string().trim().min(2).max(180).optional(),
  quantity: z.coerce.number().positive().optional(),
  unitPrice: z.coerce.number().positive().optional(),
  purchaseDate: z.string().date().optional(),
  notes: z.string().trim().optional().nullable()
});

function requireUpdatePayload(req, _res, next) {
  if (req.file || Object.keys(req.body).length > 0) {
    return next();
  }
  return next(new ApiError(400, 'At least one field or photo is required for update'));
}

router.post('/', upload.single('photo'), validate(createSchema), asyncHandler(createPurchase));
router.get('/', validate(listSchema, 'query'), asyncHandler(listPurchases));
router.put('/:id', upload.single('photo'), validate(idSchema, 'params'), validate(updateSchema), requireUpdatePayload, asyncHandler(updatePurchase));
router.delete('/:id', validate(idSchema, 'params'), asyncHandler(deletePurchase));

module.exports = router;
