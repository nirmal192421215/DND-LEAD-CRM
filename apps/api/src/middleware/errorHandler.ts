import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

// Prisma error codes: https://www.prisma.io/docs/reference/api-reference/error-reference
interface PrismaError extends Error {
  code?: string;
  meta?: Record<string, unknown>;
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const isProd = process.env.NODE_ENV === 'production';

  // ── Zod Validation Errors ────────────────────────────────────────────────────
  if (err instanceof ZodError) {
    const fields = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    res.status(422).json({
      success: false,
      error: 'Validation failed',
      fields,
    });
    return;
  }

  // ── Prisma Known Request Errors ──────────────────────────────────────────────
  const prismaErr = err as PrismaError;
  if (err.name === 'PrismaClientKnownRequestError') {
    const code = prismaErr.code;

    if (code === 'P2002') {
      // Unique constraint violation
      const target = (prismaErr.meta?.['target'] as string[])?.join(', ') ?? 'field';
      res.status(409).json({
        success: false,
        error: `${target} is already taken`,
      });
      return;
    }

    if (code === 'P2025') {
      // Record not found (e.g. update/delete on non-existent record)
      res.status(404).json({
        success: false,
        error: 'Record not found',
      });
      return;
    }

    res.status(409).json({
      success: false,
      error: isProd ? 'Database error' : `Prisma ${code}: ${err.message}`,
    });
    return;
  }

  // ── Prisma Validation Errors ─────────────────────────────────────────────────
  if (err.name === 'PrismaClientValidationError') {
    res.status(400).json({
      success: false,
      error: isProd ? 'Invalid request data' : err.message,
    });
    return;
  }

  // ── JWT Errors ───────────────────────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token',
    });
    return;
  }

  // ── Multer / File Upload Errors ──────────────────────────────────────────────
  if (err.name === 'MulterError') {
    res.status(400).json({
      success: false,
      error: `File upload error: ${err.message}`,
    });
    return;
  }

  // ── Generic Fallback ─────────────────────────────────────────────────────────
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} — ${err.name}: ${err.message}`);
  if (!isProd) console.error(err.stack);

  res.status(500).json({
    success: false,
    error: isProd ? 'Internal server error' : err.message,
  });
}
