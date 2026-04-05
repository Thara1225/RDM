const express = require('express');
const { z } = require('zod');

const validate = require('../middlewares/validate');
const asyncHandler = require('../utils/asyncHandler');
const { getReports } = require('../controllers/report.controller');

const router = express.Router();

const reportQuerySchema = z.object({
  fromDate: z.string().date().optional(),
  toDate: z.string().date().optional()
});

router.get('/', validate(reportQuerySchema, 'query'), asyncHandler(getReports));

module.exports = router;
