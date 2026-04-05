const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const ApiError = require('../utils/apiError');

const requireAuth = async (req, _res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return next(new ApiError(401, 'Authentication required'));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const admin = await prisma.admin.findUnique({
      where: { id: payload.adminId },
      select: { id: true, name: true, email: true, createdAt: true }
    });

    if (!admin) {
      return next(new ApiError(401, 'Invalid token'));
    }

    req.admin = admin;
    return next();
  } catch (_error) {
    return next(new ApiError(401, 'Invalid or expired token'));
  }
};

module.exports = { requireAuth };
