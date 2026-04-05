const { Prisma } = require('@prisma/client');
const ApiError = require('../utils/apiError');

function mapPrismaError(error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return new ApiError(409, 'Duplicate value violates unique constraint.');
    }
    if (error.code === 'P2003') {
      return new ApiError(409, 'Cannot delete this record because it is referenced by other records.');
    }
  }
  return null;
}

function mapUnhandledError(error) {
  if (error?.name === 'ZodError') {
    return new ApiError(400, 'Validation failed');
  }

  if (error?.type === 'entity.parse.failed') {
    return new ApiError(400, 'Invalid JSON payload');
  }

  if (error?.type === 'entity.too.large') {
    return new ApiError(413, 'Payload too large');
  }

  if (error?.message === 'CORS origin not allowed') {
    return new ApiError(403, 'CORS origin not allowed');
  }

  return null;
}

function errorHandler(error, _req, res, _next) {
  const prismaError = mapPrismaError(error);
  const mappedError = mapUnhandledError(error);
  const finalError = prismaError || mappedError || error;
  const requestId = _req.requestId || null;

  if (finalError instanceof ApiError) {
    return res.status(finalError.statusCode).json({
      success: false,
      message: finalError.message,
      error: {
        code: finalError.code || 'API_ERROR',
        message: finalError.message,
        details: finalError.details
      },
      requestId
    });
  }

  console.error(`[${requestId || 'no-request-id'}]`, error);
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error'
    },
    requestId
  });
}

module.exports = errorHandler;
