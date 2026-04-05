const prisma = require('../config/prisma');

function toStartOfDay(date) {
  const out = new Date(date);
  out.setHours(0, 0, 0, 0);
  return out;
}

function toEndOfDay(date) {
  const out = new Date(date);
  out.setHours(23, 59, 59, 999);
  return out;
}

function numberValue(value) {
  return Number(value || 0);
}

function dateRangeWhere(field, fromDate, toDate) {
  if (!fromDate && !toDate) {
    return {};
  }

  return {
    [field]: {
      ...(fromDate ? { gte: toStartOfDay(fromDate) } : {}),
      ...(toDate ? { lte: toEndOfDay(toDate) } : {})
    }
  };
}

async function getReports(req, res) {
  const { fromDate, toDate } = req.query;

  const purchasesWhere = dateRangeWhere('purchaseDate', fromDate, toDate);
  const cuttingsWhere = dateRangeWhere('cutDate', fromDate, toDate);
  const ordersWhere = dateRangeWhere('orderDate', fromDate, toDate);
  const paymentsWhere = dateRangeWhere('paymentDate', fromDate, toDate);

  const [
    purchases,
    cuttings,
    stockSummary,
    shopOrders,
    paymentsReceived,
    creditByShop,
    debitByShop,
    mostUsedMaterialsRaw,
    mostProducedGarmentsRaw
  ] = await Promise.all([
    prisma.purchase.findMany({
      where: purchasesWhere,
      include: {
        supplier: { select: { id: true, name: true } },
        material: { select: { id: true, name: true, unitType: true } }
      },
      orderBy: { purchaseDate: 'desc' }
    }),
    prisma.cutting.findMany({
      where: cuttingsWhere,
      include: {
        product: { select: { id: true, name: true } },
        material: { select: { id: true, name: true, unitType: true } }
      },
      orderBy: { cutDate: 'desc' }
    }),
    prisma.stock.findMany({
      include: {
        material: { select: { id: true, name: true, unitType: true } }
      },
      orderBy: {
        material: {
          name: 'asc'
        }
      }
    }),
    prisma.shopOrder.findMany({
      where: ordersWhere,
      include: {
        shop: { select: { id: true, name: true, shopCode: true } }
      },
      orderBy: [{ orderDate: 'desc' }, { billNo: 'desc' }]
    }),
    prisma.shopPayment.findMany({
      where: paymentsWhere,
      include: {
        shop: { select: { id: true, name: true, shopCode: true } }
      },
      orderBy: { paymentDate: 'desc' }
    }),
    prisma.shopOrder.groupBy({
      by: ['shopId'],
      where: ordersWhere,
      _sum: { totalPrice: true }
    }),
    prisma.shopPayment.groupBy({
      by: ['shopId'],
      where: paymentsWhere,
      _sum: { amount: true }
    }),
    prisma.cutting.groupBy({
      by: ['materialId'],
      where: cuttingsWhere,
      _sum: {
        clothUsed: true,
        quantityCut: true
      },
      _count: {
        _all: true
      }
    }),
    prisma.cutting.groupBy({
      by: ['productId'],
      where: cuttingsWhere,
      _sum: {
        quantityCut: true,
        clothUsed: true
      },
      _count: {
        _all: true
      }
    })
  ]);

  const shopMap = new Map();
  for (const row of shopOrders) {
    shopMap.set(row.shopId, row.shop);
  }
  for (const row of paymentsReceived) {
    shopMap.set(row.shopId, row.shop);
  }

  const shopWiseBillsMap = new Map();
  for (const row of shopOrders) {
    const billNo = row.billNo || `ORDER-${row.id}`;
    const key = `${row.shopId}-${billNo}`;

    if (!shopWiseBillsMap.has(key)) {
      shopWiseBillsMap.set(key, {
        shopId: row.shopId,
        shopName: row.shop?.name || '-',
        shopCode: row.shop?.shopCode || null,
        billNo,
        orderDate: row.orderDate,
        status: row.status,
        itemCount: 0,
        totalAmount: 0
      });
    }

    const bucket = shopWiseBillsMap.get(key);
    bucket.itemCount += 1;
    bucket.totalAmount += numberValue(row.totalPrice);
    if (new Date(row.orderDate) > new Date(bucket.orderDate)) {
      bucket.orderDate = row.orderDate;
    }
  }

  const shopWiseBills = [...shopWiseBillsMap.values()].sort(
    (a, b) => new Date(b.orderDate) - new Date(a.orderDate)
  );

  const creditMap = new Map();
  for (const row of creditByShop) {
    creditMap.set(row.shopId, numberValue(row._sum.totalPrice));
  }

  const debitMap = new Map();
  for (const row of debitByShop) {
    debitMap.set(row.shopId, numberValue(row._sum.amount));
  }

  const allShopIds = new Set([...creditMap.keys(), ...debitMap.keys(), ...shopMap.keys()]);
  const balanceDueByShop = [...allShopIds].map((shopId) => {
    const credit = creditMap.get(shopId) || 0;
    const debit = debitMap.get(shopId) || 0;
    return {
      shopId,
      shopName: shopMap.get(shopId)?.name || '-',
      shopCode: shopMap.get(shopId)?.shopCode || null,
      totalBills: credit,
      totalPayments: debit,
      balanceDue: credit - debit
    };
  }).sort((a, b) => b.balanceDue - a.balanceDue);

  const materialIds = mostUsedMaterialsRaw.map((item) => item.materialId);
  const productIds = mostProducedGarmentsRaw.map((item) => item.productId);

  const [materials, products] = await Promise.all([
    materialIds.length
      ? prisma.material.findMany({
          where: { id: { in: materialIds } },
          select: { id: true, name: true, unitType: true }
        })
      : [],
    productIds.length
      ? prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true }
        })
      : []
  ]);

  const materialMap = new Map(materials.map((item) => [item.id, item]));
  const productMap = new Map(products.map((item) => [item.id, item]));

  const mostUsedMaterials = mostUsedMaterialsRaw
    .map((item) => {
      const material = materialMap.get(item.materialId);
      if (!material) return null;
      return {
        materialId: material.id,
        materialName: material.name,
        unitType: material.unitType,
        totalClothUsed: numberValue(item._sum.clothUsed),
        totalQuantityCut: numberValue(item._sum.quantityCut),
        cuttingCount: item._count._all
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.totalClothUsed - a.totalClothUsed);

  const mostProducedGarments = mostProducedGarmentsRaw
    .map((item) => {
      const product = productMap.get(item.productId);
      if (!product) return null;
      return {
        productId: product.id,
        productName: product.name,
        totalProducedQty: numberValue(item._sum.quantityCut),
        totalClothUsed: numberValue(item._sum.clothUsed),
        cuttingCount: item._count._all
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.totalProducedQty - a.totalProducedQty);

  return res.status(200).json({
    meta: {
      fromDate: fromDate || null,
      toDate: toDate || null,
      generatedAt: new Date().toISOString()
    },
    purchasesByDate: purchases,
    cuttingsByDate: cuttings,
    stockSummary,
    shopWiseBills,
    paymentsReceived,
    balanceDueByShop,
    mostUsedMaterials,
    mostProducedGarments
  });
}

module.exports = {
  getReports
};
