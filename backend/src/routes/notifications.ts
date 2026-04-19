// notifications.ts
import { Router } from 'express';
import { authenticate, requireActiveUser } from '../middleware/auth';
import { prisma } from '../utils/prisma';
const notifRouter = Router();
notifRouter.use(authenticate, requireActiveUser);
notifRouter.get('/', async (req, res) => {
  const { unreadOnly, page = '1', limit = '20' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where: any = { userId: req.user!.userId, ...(unreadOnly === 'true' && { isRead: false }) };
  const [notifs, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: req.user!.userId, isRead: false } }),
  ]);
  res.json({ success: true, data: notifs, unreadCount, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } });
});
notifRouter.put('/read-all', async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user!.userId, isRead: false }, data: { isRead: true } });
  res.json({ success: true });
});
notifRouter.put('/:id/read', async (req, res) => {
  await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.user!.userId }, data: { isRead: true } });
  res.json({ success: true });
});
export default notifRouter;
