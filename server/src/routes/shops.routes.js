const express = require('express');
const { z } = require('zod');

const validate = require('../middlewares/validate');
const asyncHandler = require('../utils/asyncHandler');
const { createMasterCrudController } = require('../controllers/masterCrud.controller');

const router = express.Router();
const controller = createMasterCrudController('shop', ['name', 'shopCode', 'phone', 'address']);

const idSchema = z.object({ id: z.coerce.number().int().positive() });
const querySchema = z.object({ q: z.string().trim().min(1).optional() });

const createSchema = z.object({
  name: z.string().trim().min(2),
  shopCode: z.string().trim().min(2).max(50).optional().nullable(),
  phone: z.string().trim().min(3).max(30).optional().nullable(),
  address: z.string().trim().min(2).optional().nullable(),
  notes: z.string().trim().optional().nullable()
});

const updateSchema = createSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required for update'
});

router.post('/', validate(createSchema), asyncHandler(controller.create));
router.get('/', validate(querySchema, 'query'), asyncHandler(controller.list));
router.get('/:id', validate(idSchema, 'params'), asyncHandler(controller.getById));
router.put('/:id', validate(idSchema, 'params'), validate(updateSchema), asyncHandler(controller.update));
router.delete('/:id', validate(idSchema, 'params'), asyncHandler(controller.remove));

module.exports = router;
