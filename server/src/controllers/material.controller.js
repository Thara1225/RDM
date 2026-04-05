const path = require('path');
const fs = require('fs');
const { Prisma } = require('@prisma/client');
const prisma = require('../config/prisma');
const ApiError = require('../utils/apiError');
const { uploadDir } = require('../middlewares/upload');

async function createMaterial(req, res) {
  const { name, category, color, unitType, description } = req.body;

  if (!name || !name.trim()) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    throw new ApiError(400, 'Material name is required');
  }

  if (!unitType) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    throw new ApiError(400, 'Unit type is required');
  }

  const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

  const material = await prisma.material.create({
    data: {
      name: name.trim(),
      category: category?.trim() || null,
      color: color?.trim() || null,
      unitType,
      photoUrl,
      description: description?.trim() || null
    }
  });

  return res.status(201).json(material);
}

async function listMaterials(req, res) {
  const { q } = req.query;
  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { category: { contains: q, mode: 'insensitive' } },
          { color: { contains: q, mode: 'insensitive' } }
        ]
      }
    : {};

  const materials = await prisma.material.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });

  return res.status(200).json(materials);
}

async function getMaterialById(req, res) {
  const id = Number(req.params.id);
  const material = await prisma.material.findUnique({ where: { id } });

  if (!material) {
    throw new ApiError(404, 'Material not found');
  }

  return res.status(200).json(material);
}

async function updateMaterial(req, res) {
  const id = Number(req.params.id);
  const { name, category, color, unitType, description } = req.body;

  const existing = await prisma.material.findUnique({ where: { id }, select: { id: true, photoUrl: true } });
  if (!existing) {
    throw new ApiError(404, 'Material not found');
  }

  let photoUrl = existing.photoUrl;
  if (req.file) {
    if (existing.photoUrl) {
      const oldFilePath = path.join(uploadDir, path.basename(existing.photoUrl));
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }
    photoUrl = `/uploads/${req.file.filename}`;
  }

  const payload = {};
  if (name !== undefined) payload.name = name?.trim();
  if (category !== undefined) payload.category = category?.trim() || null;
  if (color !== undefined) payload.color = color?.trim() || null;
  if (unitType !== undefined) payload.unitType = unitType;
  if (description !== undefined) payload.description = description?.trim() || null;
  if (photoUrl !== undefined) payload.photoUrl = photoUrl;

  const updated = await prisma.material.update({
    where: { id },
    data: payload
  });

  return res.status(200).json(updated);
}

async function deleteMaterial(req, res) {
  const id = Number(req.params.id);
  const material = await prisma.material.findUnique({ where: { id }, select: { id: true, photoUrl: true } });

  if (!material) {
    throw new ApiError(404, 'Material not found');
  }

  const [purchaseCount, cuttingCount, stockCount, adjustmentCount] = await Promise.all([
    prisma.purchase.count({ where: { materialId: id } }),
    prisma.cutting.count({ where: { materialId: id } }),
    prisma.stock.count({ where: { materialId: id } }),
    prisma.stockAdjustment.count({ where: { materialId: id } })
  ]);

  if (purchaseCount > 0 || cuttingCount > 0 || stockCount > 0 || adjustmentCount > 0) {
    throw new ApiError(
      409,
      'Cannot delete material because it is used by purchases, cuttings, or stock records. Remove related records first.'
    );
  }

  if (material.photoUrl) {
    const filePath = path.join(uploadDir, path.basename(material.photoUrl));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  try {
    await prisma.material.delete({ where: { id } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2003' || error.code === 'P2014')
    ) {
      throw new ApiError(
        409,
        'Cannot delete material because it is referenced by other records. Remove related records first.'
      );
    }
    throw error;
  }

  return res.status(200).json({ message: 'Deleted successfully' });
}

module.exports = {
  createMaterial,
  listMaterials,
  getMaterialById,
  updateMaterial,
  deleteMaterial
};