import { Request, Response, NextFunction } from 'express';

export function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-admin-api-key'] as string | undefined;
  const expected = process.env.ADMIN_API_KEY;

  if (!expected || !apiKey || apiKey !== expected) {
    res.status(401).json({ error: 'Unauthorized. Valid admin API key required.' });
    return;
  }

  next();
}
