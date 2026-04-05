const prisma = require('../config/prisma');
const ApiError = require('../utils/apiError');

function toNumber(value) {
  return Number(value);
}

async function ensureProductExists(tx, productId) {
  const product = await tx.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }
}

async function ensureMaterialExists(tx, materialId) {
  const material = await tx.material.findUnique({ where: { id: materialId }, select: { id: true } });
  if (!material) {
    throw new ApiError(404, 'Material not found');
  }
}

async function getStockOrFail(tx, materialId) {
  const stock = await tx.stock.findUnique({ where: { materialId } });
  if (!stock) {
    throw new ApiError(400, 'No stock record found for selected material');
  }
  return stock;
}

async function createCutting(req, res) {
  const {
    productId,
    materialId,
    quantityCut,
    clothUsed,
    wasteQuantity = 0,
    cutDate,
    notes
  } = req.body;

  const payload = await prisma.$transaction(async (tx) => {
    await ensureProductExists(tx, productId);
    await ensureMaterialExists(tx, materialId);

    const stock = await getStockOrFail(tx, materialId);
    if (toNumber(stock.availableQuantity) < clothUsed) {
      throw new ApiError(400, 'Insufficient stock for this cutting');
    }

    const cutting = await tx.cutting.create({
      data: {
        productId,
        materialId,
        quantityCut,
        clothUsed,
        wasteQuantity,
        cutDate: new Date(cutDate),
        notes
      },
      include: {
        product: { select: { id: true, name: true } },
        material: { select: { id: true, name: true, unitType: true } }
      }
    });

    const updatedStock = await tx.stock.update({
      where: { materialId },
      data: {
        availableQuantity: { decrement: clothUsed }
      }
    });

    return { cutting, stock: updatedStock };
  });

  return res.status(201).json(payload);
}

async function listCuttings(req, res) {
  const { productId, materialId, fromDate, toDate } = req.query;

  const where = {
    ...(productId ? { productId: Number(productId) } : {}),
    ...(materialId ? { materialId: Number(materialId) } : {}),
    ...(fromDate || toDate
      ? {
          cutDate: {
            ...(fromDate ? { gte: new Date(fromDate) } : {}),
            ...(toDate ? { lte: new Date(toDate) } : {})
          }
        }
      : {})
  };

  const cuttings = await prisma.cutting.findMany({
    where,
    include: {
      product: { select: { id: true, name: true } },
      material: { select: { id: true, name: true, unitType: true } }
    },
    orderBy: { cutDate: 'desc' }
  });

  return res.status(200).json(cuttings);
}

async function getCuttingById(req, res) {
  const id = Number(req.params.id);

  const cutting = await prisma.cutting.findUnique({
    where: { id },
    include: {
      product: { select: { id: true, name: true } },
      material: { select: { id: true, name: true, unitType: true } }
    }
  });

  if (!cutting) {
    throw new ApiError(404, 'Cutting not found');
  }

  return res.status(200).json(cutting);
}

async function updateCutting(req, res) {
  const id = Number(req.params.id);

  const payload = await prisma.$transaction(async (tx) => {
    const existing = await tx.cutting.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(404, 'Cutting not found');
    }

    const productId = req.body.productId ?? existing.productId;
    const materialId = req.body.materialId ?? existing.materialId;
    const quantityCut = req.body.quantityCut ?? existing.quantityCut;
    const clothUsed = req.body.clothUsed ?? toNumber(existing.clothUsed);
    const wasteQuantity = req.body.wasteQuantity ?? toNumber(existing.wasteQuantity);
    const cutDate = req.body.cutDate ?? existing.cutDate;
    const notes = Object.prototype.hasOwnProperty.call(req.body, 'notes') ? req.body.notes : existing.notes;

    await ensureProductExists(tx, productId);
    await ensureMaterialExists(tx, materialId);

    const oldClothUsed = toNumber(existing.clothUsed);

    if (materialId === existing.materialId) {
      const stock = await getStockOrFail(tx, materialId);
      const effectiveAvailable = toNumber(stock.availableQuantity) + oldClothUsed;

      if (effectiveAvailable < clothUsed) {
        throw new ApiError(400, 'Insufficient stock for this cutting update');
      }

      await tx.stock.update({
        where: { materialId },
        data: {
          availableQuantity: effectiveAvailable - clothUsed
        }
      });
    } else {
      await tx.stock.upsert({
        where: { materialId: existing.materialId },
        update: {
          availableQuantity: { increment: oldClothUsed }
        },
        create: {
          materialId: existing.materialId,
          availableQuantity: oldClothUsed,
          minStockLevel: 0
        }
      });

      const newStock = await getStockOrFail(tx, materialId);
      if (toNumber(newStock.availableQuantity) < clothUsed) {
        throw new ApiError(400, 'Insufficient stock for selected material');
      }

      await tx.stock.update({
        where: { materialId },
        data: {
          availableQuantity: { decrement: clothUsed }
        }
      });
    }

    const updatedCutting = await tx.cutting.update({
      where: { id },
      data: {
        productId,
        materialId,
        quantityCut,
        clothUsed,
        wasteQuantity,
        cutDate: new Date(cutDate),
        notes
      },
      include: {
        product: { select: { id: true, name: true } },
        material: { select: { id: true, name: true, unitType: true } }
      }
    });

    const currentStock = await tx.stock.findUnique({ where: { materialId } });

    return {
      cutting: updatedCutting,
      stock: currentStock
    };
  });

  return res.status(200).json(payload);
}

async function deleteCutting(req, res) {
  const id = Number(req.params.id);

  const payload = await prisma.$transaction(async (tx) => {
    const existing = await tx.cutting.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(404, 'Cutting not found');
    }

    const clothUsed = toNumber(existing.clothUsed);

    const stock = await tx.stock.upsert({
      where: { materialId: existing.materialId },
      update: {
        availableQuantity: { increment: clothUsed }
      },
      create: {
        materialId: existing.materialId,
        availableQuantity: clothUsed,
        minStockLevel: 0
      }
    });

    await tx.cutting.delete({ where: { id } });

    return {
      message: 'Cutting deleted successfully',
      stock
    };
  });

  return res.status(200).json(payload);
}

module.exports = {
  createCutting,
  listCuttings,
  getCuttingById,
  updateCutting,
  deleteCutting
};
