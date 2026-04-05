const { Prisma } = require('@prisma/client');
const prisma = require('../config/prisma');
const ApiError = require('../utils/apiError');

function generateBillNo() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 900 + 100);
  return `BILL-${y}${m}${day}-${h}${min}${s}-${rand}`;
}

function toEndOfDay(date) {
  const out = new Date(date);
  out.setHours(23, 59, 59, 999);
  return out;
}

async function createShopOrder(req, res) {
  const { shopId, productId, quantity, unitPrice, orderDate, notes, status } = req.body;
  const billNo = req.body.billNo || generateBillNo();

  const totalPrice = new Prisma.Decimal(quantity).mul(new Prisma.Decimal(unitPrice));

  const order = await prisma.$transaction(async (tx) => {
    const shop = await tx.shop.findUnique({ where: { id: shopId }, select: { id: true } });
    if (!shop) {
      throw new ApiError(404, 'Shop not found');
    }

    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { id: true, stockQty: true }
    });
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    if (product.stockQty < quantity) {
      throw new ApiError(400, `Not enough stock. Available: ${product.stockQty}, requested: ${quantity}`);
    }

    const createdOrder = await tx.shopOrder.create({
      data: {
        billNo,
        shopId,
        productId,
        quantity,
        unitPrice,
        totalPrice,
        orderDate: new Date(orderDate),
        status: status || 'pending',
        notes
      },
      include: {
        shop: { select: { id: true, name: true } },
        product: { select: { id: true, name: true, photoUrl: true } }
      }
    });

    await tx.product.update({
      where: { id: productId },
      data: { stockQty: { decrement: quantity } }
    });

    return createdOrder;
  });

  return res.status(201).json(order);
}

async function createShopBill(req, res) {
  const { shopId, orderDate, notes, status, items } = req.body;
  const billNo = generateBillNo();

  const created = await prisma.$transaction(async (tx) => {
    const shop = await tx.shop.findUnique({ where: { id: shopId }, select: { id: true } });
    if (!shop) {
      throw new ApiError(404, 'Shop not found');
    }

    const quantitiesByProduct = new Map();
    for (const item of items) {
      const current = quantitiesByProduct.get(item.productId) || 0;
      quantitiesByProduct.set(item.productId, current + item.quantity);
    }

    const productIds = [...quantitiesByProduct.keys()];
    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, stockQty: true }
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const [productId, requiredQty] of quantitiesByProduct.entries()) {
      const product = productMap.get(productId);
      if (!product) {
        throw new ApiError(404, `Product ${productId} not found`);
      }
      if (product.stockQty < requiredQty) {
        throw new ApiError(400, `Not enough stock for product ${productId}. Available: ${product.stockQty}, requested: ${requiredQty}`);
      }
    }

    const createdRows = [];
    for (const item of items) {
      const totalPrice = new Prisma.Decimal(item.quantity).mul(new Prisma.Decimal(item.unitPrice));

      const row = await tx.shopOrder.create({
        data: {
          billNo,
          shopId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice,
          orderDate: new Date(orderDate),
          status: status || 'pending',
          notes
        },
        include: {
          shop: { select: { id: true, name: true, shopCode: true } },
          product: { select: { id: true, name: true, photoUrl: true } }
        }
      });

      await tx.product.update({
        where: { id: item.productId },
        data: { stockQty: { decrement: item.quantity } }
      });

      createdRows.push(row);
    }

    return createdRows;
  });

  const billTotal = created.reduce((sum, row) => sum.add(new Prisma.Decimal(row.totalPrice)), new Prisma.Decimal(0));

  return res.status(201).json({
    billNo,
    itemCount: created.length,
    totalPrice: billTotal,
    items: created
  });
}

async function listShopOrders(req, res) {
  const { shopId, productId, billNo, fromDate, toDate, status } = req.query;

  const where = {
    ...(shopId ? { shopId: Number(shopId) } : {}),
    ...(productId ? { productId: Number(productId) } : {}),
    ...(billNo ? { billNo } : {}),
    ...(status ? { status } : {}),
    ...(fromDate || toDate
      ? {
          orderDate: {
            ...(fromDate ? { gte: new Date(fromDate) } : {}),
            ...(toDate ? { lte: toEndOfDay(new Date(toDate)) } : {})
          }
        }
      : {})
  };

  const orders = await prisma.shopOrder.findMany({
    where,
    include: {
      shop: { select: { id: true, name: true } },
      product: { select: { id: true, name: true, photoUrl: true } }
    },
    orderBy: { orderDate: 'desc' }
  });

  return res.status(200).json(orders);
}

async function getShopOrderById(req, res) {
  const id = Number(req.params.id);

  const order = await prisma.shopOrder.findUnique({
    where: { id },
    include: {
      shop: { select: { id: true, name: true } },
      product: { select: { id: true, name: true, photoUrl: true } }
    }
  });

  if (!order) {
    throw new ApiError(404, 'Shop order not found');
  }

  return res.status(200).json(order);
}

async function updateShopOrder(req, res) {
  const id = Number(req.params.id);
  const { quantity, unitPrice, status, notes } = req.body;

  const existing = await prisma.shopOrder.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    throw new ApiError(404, 'Shop order not found');
  }

  const payload = { quantity, unitPrice, status, notes };
  if (quantity !== undefined && unitPrice !== undefined) {
    payload.totalPrice = new Prisma.Decimal(quantity).mul(new Prisma.Decimal(unitPrice));
  }

  const updated = await prisma.shopOrder.update({
    where: { id },
    data: payload,
    include: {
      shop: { select: { id: true, name: true } },
      product: { select: { id: true, name: true, photoUrl: true } }
    }
  });

  return res.status(200).json(updated);
}

async function deleteShopOrder(req, res) {
  const id = Number(req.params.id);

  const existing = await prisma.shopOrder.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    throw new ApiError(404, 'Shop order not found');
  }

  await prisma.shopOrder.delete({ where: { id } });
  return res.status(200).json({ message: 'Deleted successfully' });
}

async function getShopOrdersSummary(req, res) {
  const shopId = Number(req.params.shopId);

  const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { id: true } });
  if (!shop) {
    throw new ApiError(404, 'Shop not found');
  }

  const [recentOrders, stats, monthlySales] = await Promise.all([
    prisma.shopOrder.findMany({
      where: { shopId },
      take: 10,
      orderBy: { orderDate: 'desc' },
      include: {
        product: { select: { id: true, name: true, photoUrl: true } }
      }
    }),
    prisma.shopOrder.aggregate({
      where: { shopId },
      _sum: { totalPrice: true },
      _count: { _all: true }
    }),
    prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', so.order_date)::date as month,
        SUM(so.total_price) as total_sales,
        COUNT(*) as order_count
      FROM shop_orders so
      WHERE so.shop_id = ${shopId}
      AND so.status = 'completed'
      GROUP BY DATE_TRUNC('month', so.order_date)
      ORDER BY month DESC
      LIMIT 12
    `
  ]);

  return res.status(200).json({
    shopId,
    recentOrders,
    totalOrders: stats._count._all,
    totalSales: stats._sum.totalPrice || 0,
    monthlySales: monthlySales.map((row) => ({
      month: row.month,
      totalSales: row.total_sales,
      orderCount: row.order_count
    }))
  });
}

module.exports = {
  createShopOrder,
  createShopBill,
  listShopOrders,
  getShopOrderById,
  updateShopOrder,
  deleteShopOrder,
  getShopOrdersSummary
};
