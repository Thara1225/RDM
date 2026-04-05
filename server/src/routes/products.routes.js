const express = require('express');
const { z } = require('zod');

const validate = require('../middlewares/validate');
const asyncHandler = require('../utils/asyncHandler');
const { upload } = require('../middlewares/upload');
const {
  createProduct,
  listProducts,
  getProductById,
  updateProduct,
  deleteProduct
} = require('../controllers/product.controller');

const router = express.Router();

const idSchema = z.object({ id: z.coerce.number().int().positive() });
const querySchema = z.object({ q: z.string().trim().min(1).optional() });

const createSchema = z.object({
  name: z.string().trim().min(2),
  category: z.string().trim().optional().nullable(),
  dressCode: z.string().trim().optional().nullable(),
  stockQty: z.coerce.number().int().min(0).optional(),
  description: z.string().trim().optional().nullable()
});

const updateSchema = createSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required for update'
});

router.post('/', upload.single('photo'), validate(createSchema), asyncHandler(createProduct));
router.get('/', validate(querySchema, 'query'), asyncHandler(listProducts));
router.get('/:id', validate(idSchema, 'params'), asyncHandler(getProductById));
router.put('/:id', upload.single('photo'), validate(idSchema, 'params'), validate(updateSchema), asyncHandler(updateProduct));
router.delete('/:id', validate(idSchema, 'params'), asyncHandler(deleteProduct));

module.exports = router;
