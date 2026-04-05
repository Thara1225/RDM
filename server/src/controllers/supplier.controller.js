const prisma = require('../config/prisma');
const ApiError = require('../utils/apiError');

function normalizeName(name = '') {
  return name.trim().replace(/\s+/g, ' ');
}

function parseDateOnly(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function toEndOfDay(date) {
  const out = new Date(date);
  out.setHours(23, 59, 59, 999);
  return out;
}

async function ensureUniqueSupplierName(name, excludeId = null) {
  const duplicate = await prisma.supplier.findFirst({
    where: {
      name: {
        equals: name,
        mode: 'insensitive'
      },
      ...(excludeId ? { id: { not: excludeId } } : {})
    },
    select: { id: true }
  });

  if (duplicate) {
    throw new ApiError(409, 'Supplier already exists');
  }
}

async function createSupplier(req, res) {
  const payload = {
    ...req.body,
    name: normalizeName(req.body.name)
  };

  if (!payload.name) {
    throw new ApiError(400, 'Supplier name is required');
  }

  await ensureUniqueSupplierName(payload.name);

  const supplier = await prisma.supplier.create({ data: payload });
  return res.status(201).json(supplier);
}

async function listSuppliers(req, res) {
  const { q, fromDate, toDate, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  const from = parseDateOnly(fromDate);
  const to = parseDateOnly(toDate);

  const where = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } }
          ]
        }
      : {}),
    ...((from || to)
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: toEndOfDay(to) } : {})
          }
        }
      : {})
  };

  const safeSortBy = sortBy === 'name' ? 'name' : 'createdAt';
  const safeSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

  const suppliers = await prisma.supplier.findMany({
    where,
    orderBy: { [safeSortBy]: safeSortOrder }
  });

  return res.status(200).json(suppliers);
}

async function getSupplierById(req, res) {
  const id = Number(req.params.id);

  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      _count: { select: { purchases: true } }
    }
  });

  if (!supplier) {
    throw new ApiError(404, 'Supplier not found');
  }

  const [aggregate, recentPurchases, materialGroups] = await Promise.all([
    prisma.purchase.aggregate({
      where: { supplierId: id },
      _sum: { totalPrice: true }
    }),
    prisma.purchase.findMany({
      where: { supplierId: id },
      orderBy: { purchaseDate: 'desc' },
      take: 5,
      include: {
        material: { select: { id: true, name: true, unitType: true } }
      }
    }),
    prisma.purchase.groupBy({
      by: ['materialId'],
      where: { supplierId: id },
      _sum: {
        quantity: true,
        totalPrice: true
      },
      _count: {
        _all: true
      }
    })
  ]);

  const materialIds = materialGroups
    .map((item) => item.materialId)
    .filter((materialId) => Number.isInteger(materialId));
  const latestMaterialPurchases = materialIds.length
    ? await prisma.purchase.findMany({
        where: {
          supplierId: id,
          materialId: { in: materialIds }
        },
        orderBy: [{ purchaseDate: 'desc' }, { id: 'desc' }],
        select: {
          materialId: true,
          unitPrice: true
        }
      })
    : [];

  const latestUnitPriceByMaterial = new Map();
  for (const purchase of latestMaterialPurchases) {
    if (!latestUnitPriceByMaterial.has(purchase.materialId)) {
      latestUnitPriceByMaterial.set(purchase.materialId, purchase.unitPrice);
    }
  }

  const materials = materialIds.length
    ? await prisma.material.findMany({
        where: { id: { in: materialIds } },
        select: { id: true, name: true, unitType: true }
      })
    : [];

  const materialMap = new Map(materials.map((item) => [item.id, item]));
  const materialSummary = materialGroups
    .map((group) => {
      if (!Number.isInteger(group.materialId)) {
        return null;
      }

      const material = materialMap.get(group.materialId);
      if (!material) {
        return null;
      }

      return {
        materialId: material.id,
        materialName: material.name,
        unitType: material.unitType,
        totalQuantity: group._sum.quantity || 0,
        latestUnitPrice: latestUnitPriceByMaterial.get(group.materialId) || 0,
        totalAmount: group._sum.totalPrice || 0,
        purchaseCount: group._count._all
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(a.materialName).localeCompare(String(b.materialName)));

  return res.status(200).json({
    ...supplier,
    purchaseStats: {
      totalPurchases: supplier._count.purchases,
      totalAmountPurchased: aggregate._sum.totalPrice || 0
    },
    materialSummary,
    recentPurchases
  });
}

async function updateSupplier(req, res) {
  const id = Number(req.params.id);

  const existing = await prisma.supplier.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    throw new ApiError(404, 'Supplier not found');
  }

  const payload = { ...req.body };
  if (typeof payload.name === 'string') {
    payload.name = normalizeName(payload.name);
    if (!payload.name) {
      throw new ApiError(400, 'Supplier name is required');
    }
    await ensureUniqueSupplierName(payload.name, id);
  }

  const updated = await prisma.supplier.update({
    where: { id },
    data: payload
  });

  return res.status(200).json(updated);
}

async function deleteSupplier(req, res) {
  const id = Number(req.params.id);

  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      _count: { select: { purchases: true } }
    }
  });

  if (!supplier) {
    throw new ApiError(404, 'Supplier not found');
  }

  if (supplier._count.purchases > 0) {
    throw new ApiError(409, 'Cannot delete supplier with existing purchase records');
  }

  await prisma.supplier.delete({ where: { id } });
  return res.status(200).json({ message: 'Deleted successfully' });
}

async function listSupplierPurchases(req, res) {
  const id = Number(req.params.id);
  const { fromDate, toDate, materialId } = req.query;

  const supplier = await prisma.supplier.findUnique({ where: { id }, select: { id: true } });
  if (!supplier) {
    throw new ApiError(404, 'Supplier not found');
  }

  const from = parseDateOnly(fromDate);
  const to = parseDateOnly(toDate);

  const purchases = await prisma.purchase.findMany({
    where: {
      supplierId: id,
      ...(materialId ? { materialId: Number(materialId) } : {}),
      ...((from || to)
        ? {
            purchaseDate: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: toEndOfDay(to) } : {})
            }
          }
        : {})
    },
    include: {
      material: { select: { id: true, name: true, unitType: true } }
    },
    orderBy: { purchaseDate: 'desc' }
  });

  return res.status(200).json(purchases);
}

module.exports = {
  createSupplier,
  listSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  listSupplierPurchases
};
