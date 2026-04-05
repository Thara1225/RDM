const express = require('express');
const { requireAuth } = require('../middlewares/authMiddleware');

const authRoutes = require('./auth.routes');
const suppliersRoutes = require('./suppliers.routes');
const shopsRoutes = require('./shops.routes');
const materialsRoutes = require('./materials.routes');
const productsRoutes = require('./products.routes');
const purchasesRoutes = require('./purchases.routes');
const stockRoutes = require('./stock.routes');
const cuttingsRoutes = require('./cuttings.routes');
const shopOrdersRoutes = require('./shopOrders.routes');
const shopPaymentsRoutes = require('./shopPayments.routes');
const reportsRoutes = require('./reports.routes');

const router = express.Router();

router.get('/', (_req, res) => {
  res.status(200).json({ message: 'RDM API v1' });
});

router.use('/auth', authRoutes);

router.use(requireAuth);
router.use('/suppliers', suppliersRoutes);
router.use('/shops', shopsRoutes);
router.use('/materials', materialsRoutes);
router.use('/products', productsRoutes);
router.use('/purchases', purchasesRoutes);
router.use('/shop-orders', shopOrdersRoutes);
router.use('/shop-payments', shopPaymentsRoutes);
router.use('/reports', reportsRoutes);
router.use('/stock', stockRoutes);
router.use('/cuttings', cuttingsRoutes);

module.exports = router;
