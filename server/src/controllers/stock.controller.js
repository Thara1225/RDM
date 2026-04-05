const prisma = require('../config/prisma');
const ApiError = require('../utils/apiError');

async function listStock(req, res) {
  const { lowOnly, q } = req.query;

  const where = {
    ...(q
      ? {
          material: {
            name: { contains: q, mode: 'insensitive' }
          }
        }
      : {})
  };

  const stock = await prisma.stock.findMany({
    where,
    include: {
      material: {
        select: {
          id: true,
          name: true,
          unitType: true,
          photoUrl: true
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  const filtered = lowOnly === 'true'
    ? stock.filter((item) => Number(item.availableQuantity) <= Number(item.minStockLevel))
    : stock;

  return res.status(200).json(filtered);
}

async function listProductStock(req, res) {
  const { q } = req.query;

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { dressCode: { contains: q, mode: 'insensitive' } }
        ]
      }
    : {};

  const products = await prisma.product.findMany({
    where,
    select: {
      id: true,
      name: true,
      dressCode: true,
      stockQty: true,
      photoUrl: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return res.status(200).json(products);
}

async function addProductToStock(req, res) {
  const { name, dressCode, quantity } = req.body;

  const created = await prisma.product.create({
    data: {
      name: name.trim(),
      dressCode: dressCode?.trim() || null,
      stockQty: quantity
    },
    select: {
      id: true,
      name: true,
      dressCode: true,
      stockQty: true,
      photoUrl: true,
      createdAt: true
    }
  });

  return res.status(201).json(created);
}

async function adjustProductStock(req, res) {
  const id = Number(req.params.id);
  const { action, quantity } = req.body;

  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true, stockQty: true }
  });

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  let nextQty = product.stockQty;

  if (action === 'set') {
    nextQty = quantity;
  } else if (action === 'add') {
    nextQty = product.stockQty + quantity;
  } else if (action === 'remove') {
    if (product.stockQty < quantity) {
      throw new ApiError(400, 'Not enough stock to remove');
    }
    nextQty = product.stockQty - quantity;
  }

  const updated = await prisma.product.update({
    where: { id },
    data: { stockQty: nextQty },
    select: {
      id: true,
      name: true,
      dressCode: true,
      stockQty: true,
      photoUrl: true,
      createdAt: true
    }
  });

  return res.status(200).json(updated);
}

module.exports = {
  listStock,
  listProductStock,
  addProductToStock,
  adjustProductStock
};
