const express = require('express');
const { z } = require('zod');

const validate = require('../middlewares/validate');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { upload } = require('../middlewares/upload');
const {
  createMaterial,
  listMaterials,
  getMaterialById,
  updateMaterial,
  deleteMaterial
} = require('../controllers/material.controller');

const router = express.Router();

const idSchema = z.object({ id: z.coerce.number().int().positive() });
const querySchema = z.object({ q: z.string().trim().min(1).optional() });

const unitTypeSchema = z.enum(['yard', 'kg', 'piece']);

const createSchema = z.object({
  name: z.string().trim().min(2),
  category: z.string().trim().min(2).optional().nullable(),
  color: z.string().trim().min(2).optional().nullable(),
  unitType: unitTypeSchema,
  description: z.string().trim().optional().nullable()
});

const updateSchema = createSchema.partial();

function requireUpdatePayload(req, _res, next) {
  if (req.file || Object.keys(req.body).length > 0) {
    return next();
  }
  return next(new ApiError(400, 'At least one field or photo is required for update'));
}

router.post('/', upload.single('photo'), validate(createSchema), asyncHandler(createMaterial));
router.get('/', validate(querySchema, 'query'), asyncHandler(listMaterials));
router.get('/:id', validate(idSchema, 'params'), asyncHandler(getMaterialById));
router.put('/:id', upload.single('photo'), validate(idSchema, 'params'), validate(updateSchema), requireUpdatePayload, asyncHandler(updateMaterial));
router.delete('/:id', validate(idSchema, 'params'), asyncHandler(deleteMaterial));

module.exports = router;
