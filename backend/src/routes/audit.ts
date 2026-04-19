// audit.ts
import { Router } from 'express';
import { authenticate, requireActiveUser } from '../middleware/auth';
import { prisma } from '../utils/prisma';
const auditRouter = Router();
auditRouter.use(authenticate, requireActiveUser);
auditRouter.get('/', async (req, res) => {
  const { page = '1', limit = '30', severity } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where: any = { userId: req.user!.userId, ...(severity && { severity }) };
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
    prisma.auditLog.count({ where }),
  ]);
  res.setHeader('X-Total-Count', total);
  res.json({ success: true, data: logs, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } });
});
export default auditRouter;
