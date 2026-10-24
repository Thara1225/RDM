const express = require('express');
const { z } = require('zod');
const validate = require('../middlewares/validate');
const asyncHandler = require('../utils/asyncHandler');
const { createMasterCrudController } = require('../controllers/masterCrud.controller');

const router = express.Router();
const controller = createMasterCrudController('employee', ['name', 'empCode', 'department']);
const idSchema = z.object({ id: z.coerce.number().int().positive() });
const querySchema = z.object({ q: z.string().trim().min(1).optional() });
const employeeSchema = z.object({
  empCode: z.string().trim().min(1).max(50),
  name: z.string().trim().min(2).max(150),
  department: z.string().trim().max(100).optional().nullable(),
  payType: z.enum(['daily', 'piece']),
  dailyRate: z.coerce.number().nonnegative().optional().nullable(),
  pieceRate: z.coerce.number().nonnegative().optional().nullable(),
  hourlyRate: z.coerce.number().nonnegative().optional().nullable(),
  active: z.boolean().optional()
});

router.post('/', validate(employeeSchema), asyncHandler(controller.create));
router.get('/', validate(querySchema, 'query'), asyncHandler(controller.list));
router.get('/:id', validate(idSchema, 'params'), asyncHandler(controller.getById));
router.put('/:id', validate(idSchema, 'params'), validate(employeeSchema.partial()), asyncHandler(controller.update));
router.delete('/:id', validate(idSchema, 'params'), asyncHandler(controller.remove));

module.exports = router;