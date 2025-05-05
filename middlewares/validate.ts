import type { Request, Response, NextFunction } from 'express';
import { ZodError, type AnyZodObject } from 'zod';

export const validate =
  (schema: AnyZodObject) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsedData = schema.parse(req.body);
      req.body = parsedData.body;

      return next();
    } catch (error: ZodError | any) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(400).json({ success: false, errors: error });
    }
  };
