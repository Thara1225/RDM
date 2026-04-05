const express = require('express');
const { z } = require('zod');

const validate = require('../middlewares/validate');
const asyncHandler = require('../utils/asyncHandler');
const {
  createCutting,
  listCuttings,
  getCuttingById,
  updateCutting,
  deleteCutting
} = require('../controllers/cutting.controller');

const router = express.Router();

const idSchema = z.object({ id: z.coerce.number().int().positive() });

const createSchema = z.object({
  productId: z.coerce.number().int().positive(),
  materialId: z.coerce.number().int().positive(),
  quantityCut: z.coerce.number().int().positive(),
  clothUsed: z.coerce.number().positive(),
  wasteQuantity: z.coerce.number().min(0).optional(),
  cutDate: z.string().date(),
  notes: z.string().trim().optional().nullable()
});

const updateSchema = z
  .object({
    productId: z.coerce.number().int().positive().optional(),
    materialId: z.coerce.number().int().positive().optional(),
    quantityCut: z.coerce.number().int().positive().optional(),
    clothUsed: z.coerce.number().positive().optional(),
    wasteQuantity: z.coerce.number().min(0).optional(),
    cutDate: z.string().date().optional(),
    notes: z.string().trim().optional().nullable()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required for update'
  });

const listSchema = z.object({
  productId: z.string().regex(/^\d+$/).optional(),
  materialId: z.string().regex(/^\d+$/).optional(),
  fromDate: z.string().date().optional(),
  toDate: z.string().date().optional()
});

router.post('/', validate(createSchema), asyncHandler(createCutting));
router.get('/', validate(listSchema, 'query'), asyncHandler(listCuttings));
router.get('/:id', validate(idSchema, 'params'), asyncHandler(getCuttingById));
router.put('/:id', validate(idSchema, 'params'), validate(updateSchema), asyncHandler(updateCutting));
router.delete('/:id', validate(idSchema, 'params'), asyncHandler(deleteCutting));

module.exports = router;
