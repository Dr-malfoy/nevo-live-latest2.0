import { Response } from 'express';

export const sendSuccess = (res: Response, data: any, message?: string, status: number = 200) => {
  return res.status(status).json({
    success: true,
    data,
    ...(message && { message }),
  });
};

export const sendError = (res: Response, error: string, status: number = 400) => {
  return res.status(status).json({
    success: false,
    error,
  });
};

export const sendPaginated = (
  res: Response,
  data: any[],
  total: number,
  page: number,
  limit: number
) => {
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
};
