const { Prisma } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = require('../config/prisma');
const ApiError = require('../utils/apiError');
const { uploadDir } = require('../middlewares/upload');

function toEndOfDay(date) {
  const out = new Date(date);
  out.setHours(23, 59, 59, 999);
  return out;
}

async function createPurchase(req, res) {
  const { supplierId, materialId, itemName, quantity, unitPrice, purchaseDate, notes } = req.body;

  const totalPrice = new Prisma.Decimal(quantity).mul(new Prisma.Decimal(unitPrice));
  const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

  const payload = await prisma.$transaction(async (tx) => {
    if (supplierId) {
      const supplier = await tx.supplier.findUnique({ where: { id: supplierId }, select: { id: true } });
      if (!supplier) {
        throw new ApiError(404, 'Supplier not found');
      }
    }

    let material = null;
    if (materialId) {
      material = await tx.material.findUnique({ where: { id: materialId }, select: { id: true, name: true } });
      if (!material) {
        throw new ApiError(404, 'Material not found');
      }
    }

    const purchase = await tx.purchase.create({
      data: {
        supplierId: supplierId || null,
        materialId: materialId || null,
        itemName: itemName?.trim() || material?.name || null,
        photoUrl,
        quantity,
        unitPrice,
        totalPrice,
        purchaseDate: new Date(purchaseDate),
        notes
      }
    });

    let stock = null;
    if (materialId) {
      stock = await tx.stock.upsert({
        where: { materialId },
        update: {
          availableQuantity: { increment: quantity }
        },
        create: {
          materialId,
          availableQuantity: quantity,
          minStockLevel: 0
        }
      });
    }

    return { purchase, stock };
  });

  return res.status(201).json(payload);
}

async function listPurchases(req, res) {
  const { supplierId, materialId, scope, fromDate, toDate } = req.query;

  const where = {
    ...(supplierId ? { supplierId: Number(supplierId) } : {}),
    ...(materialId ? { materialId: Number(materialId) } : {}),
    ...(scope === 'standalone' ? { materialId: null } : {}),
    ...(scope === 'material' ? { materialId: { not: null } } : {}),
    ...(fromDate || toDate
      ? {
          purchaseDate: {
            ...(fromDate ? { gte: new Date(fromDate) } : {}),
            ...(toDate ? { lte: toEndOfDay(new Date(toDate)) } : {})
          }
        }
      : {})
  };

  const purchases = await prisma.purchase.findMany({
    where,
    include: {
      supplier: { select: { id: true, name: true } },
      material: { select: { id: true, name: true, unitType: true } }
    },
    orderBy: { purchaseDate: 'desc' }
  });

  return res.status(200).json(purchases);
}

async function updatePurchase(req, res) {
  const id = Number(req.params.id);
  const { itemName, quantity, unitPrice, purchaseDate, notes } = req.body;

  const existing = await prisma.purchase.findUnique({
    where: { id },
    select: { id: true, materialId: true, photoUrl: true, quantity: true, unitPrice: true }
  });

  if (!existing) {
    throw new ApiError(404, 'Purchase not found');
  }

  if (existing.materialId) {
    throw new ApiError(409, 'Only standalone purchases can be edited here');
  }

  let nextPhotoUrl = existing.photoUrl;
  if (req.file) {
    if (existing.photoUrl) {
      const oldFilePath = path.join(uploadDir, path.basename(existing.photoUrl));
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }
    nextPhotoUrl = `/uploads/${req.file.filename}`;
  }

  const nextQuantity = quantity !== undefined ? Number(quantity) : Number(existing.quantity);
  const nextUnitPrice = unitPrice !== undefined ? Number(unitPrice) : Number(existing.unitPrice);

  const payload = {
    ...(itemName !== undefined ? { itemName: itemName?.trim() || null } : {}),
    ...(quantity !== undefined ? { quantity: nextQuantity } : {}),
    ...(unitPrice !== undefined ? { unitPrice: nextUnitPrice } : {}),
    ...(purchaseDate !== undefined ? { purchaseDate: new Date(purchaseDate) } : {}),
    ...(notes !== undefined ? { notes } : {}),
    ...(req.file ? { photoUrl: nextPhotoUrl } : {})
  };

  payload.totalPrice = new Prisma.Decimal(nextQuantity).mul(new Prisma.Decimal(nextUnitPrice));

  const updated = await prisma.purchase.update({
    where: { id },
    data: payload,
    include: {
      supplier: { select: { id: true, name: true } },
      material: { select: { id: true, name: true, unitType: true } }
    }
  });

  return res.status(200).json(updated);
}

async function deletePurchase(req, res) {
  const id = Number(req.params.id);

  const existing = await prisma.purchase.findUnique({
    where: { id },
    select: { id: true, materialId: true, photoUrl: true }
  });

  if (!existing) {
    throw new ApiError(404, 'Purchase not found');
  }

  if (existing.materialId) {
    throw new ApiError(409, 'Only standalone purchases can be deleted here');
  }

  if (existing.photoUrl) {
    const filePath = path.join(uploadDir, path.basename(existing.photoUrl));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  await prisma.purchase.delete({ where: { id } });
  return res.status(200).json({ message: 'Deleted successfully' });
}

module.exports = { createPurchase, listPurchases, updatePurchase, deletePurchase };
