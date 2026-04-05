const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');
const ApiError = require('../utils/apiError');
const { generateAdminToken } = require('../services/jwt');

async function login(req, res) {
  const { email, password } = req.body;

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const passwordMatched = await bcrypt.compare(password, admin.passwordHash);
  if (!passwordMatched) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = generateAdminToken(admin);

  return res.status(200).json({
    message: 'Login successful',
    token,
    admin: {
      id: admin.id,
      name: admin.name,
      email: admin.email
    }
  });
}

function me(req, res) {
  return res.status(200).json({ admin: req.admin });
}

module.exports = { login, me };
