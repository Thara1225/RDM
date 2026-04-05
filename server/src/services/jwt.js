const jwt = require('jsonwebtoken');

function generateAdminToken(admin) {
  return jwt.sign(
    {
      adminId: admin.id,
      email: admin.email
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
}

module.exports = { generateAdminToken };
