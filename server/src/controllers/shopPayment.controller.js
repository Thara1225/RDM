const prisma = require('../config/prisma');
const ApiError = require('../utils/apiError');

async function createShopPayment(req, res) {
  const { shopId, amount, paymentDate, description, notes } = req.body;

  if (!shopId || !amount || !paymentDate) {
    throw new ApiError(400, 'Shop ID, amount, and payment date are required');
  }

  // Verify shop exists
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) {
    throw new ApiError(404, 'Shop not found');
  }

  const payment = await prisma.shopPayment.create({
    data: {
      shopId,
      amount: parseFloat(amount),
      paymentDate: new Date(paymentDate),
      description,
      notes
    }
  });

  return res.status(201).json(payment);
}

async function listShopPayments(req, res) {
  const { shopId } = req.query;

  const where = shopId ? { shopId: Number(shopId) } : {};

  const payments = await prisma.shopPayment.findMany({
    where,
    include: { shop: true },
    orderBy: { paymentDate: 'desc' }
  });

  return res.status(200).json(payments);
}

async function getShopPaymentById(req, res) {
  const id = Number(req.params.id);

  const payment = await prisma.shopPayment.findUnique({
    where: { id },
    include: { shop: true }
  });

  if (!payment) {
    throw new ApiError(404, 'Payment not found');
  }

  return res.status(200).json(payment);
}

async function updateShopPayment(req, res) {
  const id = Number(req.params.id);

  const exists = await prisma.shopPayment.findUnique({
    where: { id },
    select: { id: true }
  });

  if (!exists) {
    throw new ApiError(404, 'Payment not found');
  }

  const updated = await prisma.shopPayment.update({
    where: { id },
    data: {
      ...req.body,
      amount: req.body.amount ? parseFloat(req.body.amount) : undefined,
      paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : undefined
    },
    include: { shop: true }
  });

  return res.status(200).json(updated);
}

async function deleteShopPayment(req, res) {
  const id = Number(req.params.id);

  const exists = await prisma.shopPayment.findUnique({
    where: { id },
    select: { id: true }
  });

  if (!exists) {
    throw new ApiError(404, 'Payment not found');
  }

  await prisma.shopPayment.delete({ where: { id } });

  return res.status(200).json({ message: 'Payment deleted successfully' });
}

async function getShopAccountsSummary(req, res) {
  // Get all shops with their credit and debit
  const shops = await prisma.shop.findMany({
    select: {
      id: true,
      name: true,
      shopCode: true
    },
    orderBy: { name: 'asc' }
  });

  // Get credit (sum of all shop orders for each shop)
  const creditData = await prisma.shopOrder.groupBy({
    by: ['shopId'],
    _sum: {
      totalPrice: true
    }
  });

  // Get debit (sum of all payments for each shop)
  const debitData = await prisma.shopPayment.groupBy({
    by: ['shopId'],
    _sum: {
      amount: true
    }
  });

  // Create a map for quick lookup
  const creditMap = new Map();
  const debitMap = new Map();

  creditData.forEach((item) => {
    creditMap.set(item.shopId, parseFloat(item._sum.totalPrice || 0));
  });

  debitData.forEach((item) => {
    debitMap.set(item.shopId, parseFloat(item._sum.amount || 0));
  });

  // Build result with credit, debit, and balance for each shop
  const shopAccounts = shops.map((shop) => {
    const credit = creditMap.get(shop.id) || 0;
    const debit = debitMap.get(shop.id) || 0;
    const balance = credit - debit;

    return {
      id: shop.id,
      name: shop.name,
      shopCode: shop.shopCode,
      totalCredit: credit,
      totalDebit: debit,
      balance
    };
  });

  return res.status(200).json(shopAccounts);
}

module.exports = {
  createShopPayment,
  listShopPayments,
  getShopPaymentById,
  updateShopPayment,
  deleteShopPayment,
  getShopAccountsSummary
};
