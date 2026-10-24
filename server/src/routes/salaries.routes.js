const express = require('express');
const { z } = require('zod');
const validate = require('../middlewares/validate');
const asyncHandler = require('../utils/asyncHandler');
const { listSalaries, generateSalaries, updateSalary, updateSalaryStatus } = require('../controllers/salary.controller');

const router = express.Router();
const monthYearSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max( calendarYear() + 1 )
});
function calendarYear() { return new Date().getFullYear(); }
const listSchema = monthYearSchema.extend({ department: z.string().trim().optional(), q: z.string().trim().optional() });
const updateSchema = z.object({
  daysWorked: z.coerce.number().int().nonnegative(),
  piecesDone: z.coerce.number().nonnegative(),
  otHours: z.coerce.number().nonnegative(),
  allowances: z.coerce.number().nonnegative(),
  bonus: z.coerce.number().nonnegative(),
  advanceDeduction: z.coerce.number().nonnegative(),
  otherDeductions: z.coerce.number().nonnegative()
});
const statusSchema = z.object({ status: z.enum(['draft', 'approved', 'paid']) });
const idSchema = z.object({ id: z.coerce.number().int().positive() });

router.get('/', validate(listSchema, 'query'), asyncHandler(listSalaries));
router.post('/generate', validate(monthYearSchema), asyncHandler(generateSalaries));
router.put('/:id', validate(idSchema, 'params'), validate(updateSchema), asyncHandler(updateSalary));
router.patch('/:id/status', validate(idSchema, 'params'), validate(statusSchema), asyncHandler(updateSalaryStatus));

module.exports = router;