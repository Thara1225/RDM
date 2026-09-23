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

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  const admin = await prisma.admin.findUnique({ where: { id: req.admin.id } });

  if (!admin) {
    throw new ApiError(401, 'Admin account not found');
  }

  const passwordMatched = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!passwordMatched) {
    throw new ApiError(400, 'Current password is incorrect');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.admin.update({
    where: { id: admin.id },
    data: { passwordHash }
  });

  return res.status(200).json({ message: 'Password changed successfully' });
}

async function changePasswordFromLogin(req, res) {
  const { email, currentPassword, newPassword } = req.body;
  const admin = await prisma.admin.findUnique({ where: { email } });

  if (!admin) {
    throw new ApiError(400, 'Email or current password is incorrect');
  }

  const passwordMatched = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!passwordMatched) {
    throw new ApiError(400, 'Email or current password is incorrect');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.admin.update({
    where: { id: admin.id },
    data: { passwordHash }
  });

  return res.status(200).json({ message: 'Password changed successfully. You can now log in.' });
}

function me(req, res) {
  return res.status(200).json({ admin: req.admin });
}

module.exports = { login, me, changePassword, changePasswordFromLogin };
