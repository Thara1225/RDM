const path = require('path');
const fs = require('fs');
const { Prisma } = require('@prisma/client');
const prisma = require('../config/prisma');
const ApiError = require('../utils/apiError');
const { uploadDir } = require('../middlewares/upload');

async function createProduct(req, res) {
  const { name, category, dressCode, stockQty, description } = req.body;

  if (!name || !name.trim()) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    throw new ApiError(400, 'Product name is required');
  }

  let photoUrl = null;
  if (req.file) {
    photoUrl = `/uploads/${req.file.filename}`;
  }

  const product = await prisma.product.create({
    data: {
      name: name.trim(),
      category: category?.trim() || null,
      dressCode: dressCode?.trim() || null,
      stockQty: stockQty ?? 0,
      photoUrl,
      description: description?.trim() || null
    }
  });

  return res.status(201).json(product);
}

async function listProducts(req, res) {
  const { q } = req.query;
  const where = q
    ? {
        dressCode: { contains: q, mode: 'insensitive' }
      }
    : {};

  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });

  return res.status(200).json(products);
}

async function getProductById(req, res) {
  const id = Number(req.params.id);

  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  return res.status(200).json(product);
}

async function updateProduct(req, res) {
  const id = Number(req.params.id);
  const { name, category, dressCode, stockQty, description } = req.body;

  const existing = await prisma.product.findUnique({ where: { id }, select: { id: true, photoUrl: true } });
  if (!existing) {
    throw new ApiError(404, 'Product not found');
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
  if (dressCode !== undefined) payload.dressCode = dressCode?.trim() || null;
  if (description !== undefined) payload.description = description?.trim() || null;
  if (stockQty !== undefined) payload.stockQty = Number(stockQty);
  if (photoUrl !== undefined) payload.photoUrl = photoUrl;

  const updated = await prisma.product.update({
    where: { id },
    data: payload
  });

  return res.status(200).json(updated);
}

async function deleteProduct(req, res) {
  const id = Number(req.params.id);

  const product = await prisma.product.findUnique({ where: { id }, select: { id: true, photoUrl: true } });

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const [shopOrderCount, cuttingCount] = await Promise.all([
    prisma.shopOrder.count({ where: { productId: id } }),
    prisma.cutting.count({ where: { productId: id } })
  ]);

  if (shopOrderCount > 0 || cuttingCount > 0) {
    throw new ApiError(
      409,
      'Cannot delete product because it is used by shop orders or cuttings. Remove related records first.'
    );
  }

  if (product.photoUrl) {
    const filePath = path.join(uploadDir, path.basename(product.photoUrl));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  try {
    await prisma.product.delete({ where: { id } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2003' || error.code === 'P2014')
    ) {
      throw new ApiError(
        409,
        'Cannot delete product because it is referenced by other records. Remove related records first.'
      );
    }
    throw error;
  }

  return res.status(200).json({ message: 'Deleted successfully' });
}

module.exports = {
  createProduct,
  listProducts,
  getProductById,
  updateProduct,
  deleteProduct
};
