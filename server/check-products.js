const prisma = require('./src/config/prisma');

(async () => {
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        photoUrl: true
      }
    });
    console.log('Products:', JSON.stringify(products, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
