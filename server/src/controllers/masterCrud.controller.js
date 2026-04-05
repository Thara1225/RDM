const prisma = require('../config/prisma');
const ApiError = require('../utils/apiError');

function createMasterCrudController(modelName, searchableFields = ['name']) {
  const model = prisma[modelName];

  async function create(req, res) {
    const record = await model.create({ data: req.body });
    return res.status(201).json(record);
  }

  async function list(req, res) {
    const { q } = req.query;
    const where = q
      ? {
          OR: searchableFields.map((field) => ({
            [field]: { contains: q, mode: 'insensitive' }
          }))
        }
      : {};

    const records = await model.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json(records);
  }

  async function getById(req, res) {
    const id = Number(req.params.id);
    const record = await model.findUnique({ where: { id } });

    if (!record) {
      throw new ApiError(404, 'Record not found');
    }

    return res.status(200).json(record);
  }

  async function update(req, res) {
    const id = Number(req.params.id);

    const exists = await model.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      throw new ApiError(404, 'Record not found');
    }

    const updated = await model.update({
      where: { id },
      data: req.body
    });

    return res.status(200).json(updated);
  }

  async function remove(req, res) {
    const id = Number(req.params.id);

    const exists = await model.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      throw new ApiError(404, 'Record not found');
    }

    await model.delete({ where: { id } });
    return res.status(200).json({ message: 'Deleted successfully' });
  }

  return { create, list, getById, update, remove };
}

module.exports = { createMasterCrudController };
