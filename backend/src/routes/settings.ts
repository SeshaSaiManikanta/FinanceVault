// settings.ts
import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireActiveUser } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { hashPin, verifyPin } from '../utils/encryption';
import { AppError } from '../middleware/errorHandler';
import { createAuditLog } from '../services/auditService';

const settingsRouter = Router();
settingsRouter.use(authenticate, requireActiveUser);

settingsRouter.get('/alerts', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { alertPrefs: true, phone: true, email: true } });
  res.json({ success: true, data: user });
});

settingsRouter.put('/alerts', async (req, res) => {
  const prefs = req.body.alertPrefs;
  const user = await prisma.user.update({ where: { id: req.user!.userId }, data: { alertPrefs: prefs }, select: { alertPrefs: true } });
  res.json({ success: true, data: user });
});

settingsRouter.put('/pin', async (req, res) => {
  const { currentPin, newPin } = z.object({ currentPin: z.string().optional(), newPin: z.string().regex(/^\d{4}$/) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { securityPinHash: true } });
  if (!user) throw new AppError('User not found', 404);

  if (user.securityPinHash && currentPin) {
    const [hash, salt] = user.securityPinHash.split(':');
    const valid = await verifyPin(currentPin, hash, salt);
    if (!valid) throw new AppError('Current PIN is incorrect', 400, 'INVALID_PIN');
  }

  const pinData = await hashPin(newPin);
  await prisma.user.update({ where: { id: req.user!.userId }, data: { securityPinHash: `${pinData.hash}:${pinData.salt}` } });
  await createAuditLog(req.user!.userId, 'PIN_CHANGED', undefined, undefined, 'Security PIN updated', 'MEDIUM', req);
  res.json({ success: true, message: 'PIN updated' });
});

export default settingsRouter;
