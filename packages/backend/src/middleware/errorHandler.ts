import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export class AppError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode: number = 400, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'AppError';
  }
}

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.code && { code: err.code }),
    });
    return;
  }

  // Mongoose duplicate key error (E11000)
  if (err && (err.code === 11000 || err.name === 'MongoServerError' && err.code === 11000)) {
    const fields = Object.keys(err.keyValue || {}).join(', ');
    const message = fields
      ? `Duplicate value for field: ${fields}. This is already in use.`
      : 'Duplicate entry detected. Please check your data and try again.';
    res.status(400).json({
      success: false,
      error: message,
      code: 'DUPLICATE_KEY',
    });
    return;
  }

  // Mongoose validation error
  if (err && err.name === 'ValidationError' && err.errors) {
    const messages = Object.values(err.errors).map((e: any) => e.message).join('; ');
    res.status(400).json({
      success: false,
      error: messages || 'Validation error',
      code: 'VALIDATION_ERROR',
    });
    return;
  }

  // Mongoose CastError (invalid ObjectId, etc.)
  if (err && err.name === 'CastError') {
    res.status(400).json({
      success: false,
      error: `Invalid format for ${err.path || 'field'}`,
      code: 'INVALID_FORMAT',
    });
    return;
  }

  console.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    error: env.nodeEnv === 'production' ? 'Internal server error' : (err?.message || 'Internal server error'),
  });
};

