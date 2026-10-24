const prisma = require('../config/prisma');
const ApiError = require('../utils/apiError');

const EPF_RATE = 0.08;
const EMPLOYER_EPF_RATE = 0.12;
const ETF_RATE = 0.03;

function money(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function calculateSalary(employee, input) {
  const daysWorked = Number(input.daysWorked || 0);
  const piecesDone = Number(input.piecesDone || 0);
  const otHours = Number(input.otHours || 0);
  const allowances = Number(input.allowances || 0);
  const bonus = Number(input.bonus || 0);
  const advanceDeduction = Number(input.advanceDeduction || 0);
  const otherDeductions = Number(input.otherDeductions || 0);
  const dailyRate = Number(employee.dailyRate || 0);
  const pieceRate = Number(employee.pieceRate || 0);
  const hourlyRate = Number(employee.hourlyRate || dailyRate / 8);
  const basicPay = employee.payType === 'piece' ? piecesDone * pieceRate : daysWorked * dailyRate;
  const otPay = otHours * hourlyRate * 1.5;
  const grossPay = basicPay + otPay + allowances + bonus;
  const epfDeduction = grossPay * EPF_RATE;
  const netPay = grossPay - epfDeduction - advanceDeduction - otherDeductions;

  return {
    daysWorked,
    piecesDone: money(piecesDone),
    otHours: money(otHours),
    basicPay: money(basicPay),
    otPay: money(otPay),
    allowances: money(allowances),
    bonus: money(bonus),
    epfDeduction: money(epfDeduction),
    advanceDeduction: money(advanceDeduction),
    otherDeductions: money(otherDeductions),
    grossPay: money(grossPay),
    netPay: money(netPay),
    employerEpf: money(grossPay * EMPLOYER_EPF_RATE),
    employerEtf: money(grossPay * ETF_RATE)
  };
}

async function listSalaries(req, res) {
  const month = Number(req.query.month);
  const year = Number(req.query.year);
  const where = { month, year };
  if (req.query.department) {
    where.employee = { department: req.query.department };
  }
  if (req.query.q) {
    where.employee = {
      ...(where.employee || {}),
      OR: [
        { name: { contains: req.query.q, mode: 'insensitive' } },
        { empCode: { contains: req.query.q, mode: 'insensitive' } }
      ]
    };
  }

  const records = await prisma.salaryRecord.findMany({
    where,
    include: { employee: true },
    orderBy: { employee: { name: 'asc' } }
  });
  const totals = records.reduce((result, record) => ({
    grossPay: result.grossPay + Number(record.grossPay),
    netPay: result.netPay + Number(record.netPay),
    employerEpf: result.employerEpf + Number(record.employerEpf),
    employerEtf: result.employerEtf + Number(record.employerEtf)
  }), { grossPay: 0, netPay: 0, employerEpf: 0, employerEtf: 0 });

  return res.json({ records, totals, count: records.length });
}

async function generateSalaries(req, res) {
  const { month, year } = req.body;
  const employees = await prisma.employee.findMany({ where: { active: true } });
  const existing = await prisma.salaryRecord.findMany({
    where: { month, year },
    select: { employeeId: true }
  });
  const existingIds = new Set(existing.map((record) => record.employeeId));
  const data = employees
    .filter((employee) => !existingIds.has(employee.id))
    .map((employee) => ({ employeeId: employee.id, month, year, ...calculateSalary(employee, {}) }));

  if (data.length) {
    await prisma.salaryRecord.createMany({ data });
  }
  return res.status(201).json({ created: data.length, skipped: employees.length - data.length });
}

async function updateSalary(req, res) {
  const id = Number(req.params.id);
  const record = await prisma.salaryRecord.findUnique({ where: { id }, include: { employee: true } });
  if (!record) throw new ApiError(404, 'Salary record not found');
  if (record.status !== 'draft') throw new ApiError(409, 'Only draft salaries can be edited');

  const calculated = calculateSalary(record.employee, req.body);
  const updated = await prisma.salaryRecord.update({ where: { id }, data: calculated, include: { employee: true } });
  return res.json(updated);
}

async function updateSalaryStatus(req, res) {
  const id = Number(req.params.id);
  const record = await prisma.salaryRecord.findUnique({ where: { id } });
  if (!record) throw new ApiError(404, 'Salary record not found');
  if (record.status === 'paid') throw new ApiError(409, 'Paid salaries are locked');
  if (req.body.status === 'paid' && record.status !== 'approved') {
    throw new ApiError(409, 'Approve the salary before marking it paid');
  }
  const updated = await prisma.salaryRecord.update({ where: { id }, data: { status: req.body.status }, include: { employee: true } });
  return res.json(updated);
}

module.exports = { listSalaries, generateSalaries, updateSalary, updateSalaryStatus };