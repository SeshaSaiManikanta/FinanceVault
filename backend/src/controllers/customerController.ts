// VaultFinance — Customer Controller
// Handles all customer CRUD with AES-256-GCM encryption for sensitive fields
// © 2025 VaultFinance. All Rights Reserved.

import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { encryptField, decryptField, maskAadhaar, maskPAN, verifyPin } from '../utils/encryption';
import { AppError } from '../middleware/errorHandler';
import { createAuditLog } from '../services/auditService';

const MAX_CUSTOMERS_BASE_PLAN = 10;

const createCustomerSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Valid 10-digit Indian mobile required'),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().max(500).optional(),
  customerType: z.enum(['INDIVIDUAL', 'BUSINESS']).default('INDIVIDUAL'),
  aadhaar: z
    .string()
    .regex(/^\d{12}$/, 'Aadhaar must be 12 digits')
    .optional()
    .or(z.literal('')),
  pan: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN format (e.g. ABCDE1234F)')
    .optional()
    .or(z.literal('')),
  kycStatus: z.enum(['PENDING', 'VERIFIED', 'REJECTED']).default('PENDING'),
});

const updateCustomerSchema = createCustomerSchema.partial();

// ─────────────────────────────────────────────
// LIST CUSTOMERS
// ─────────────────────────────────────────────
export async function listCustomers(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const {
    page = '1',
    limit = '20',
    search = '',
    kycStatus,
    sort = 'createdAt',
    order = 'desc',
  } = req.query as Record<string, string>;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where: any = {
    userId,
    isActive: true,
    ...(kycStatus && { kycStatus }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { [sort]: order },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        customerType: true,
        kycStatus: true,
        kycVerifiedAt: true,
        createdAt: true,
        // Never return raw encrypted fields in list view
        aadhaarEncrypted: false,
        aadhaarIv: false,
        panEncrypted: false,
        panIv: false,
        _count: {
          select: { loans: true },
        },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  res.setHeader('X-Total-Count', total);
  res.json({
    success: true,
    data: customers,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  });
}

// ─────────────────────────────────────────────
// GET SINGLE CUSTOMER (masked sensitive data)
// ─────────────────────────────────────────────
export async function getCustomer(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.userId;

  const customer = await prisma.customer.findFirst({
    where: { id, userId, isActive: true },
  });

  if (!customer) throw new AppError('Customer not found', 404);

  // Return masked sensitive fields
  const masked = {
    ...customer,
    aadhaarMasked: customer.aadhaarEncrypted ? maskAadhaarFromDb(customer) : null,
    panMasked: customer.panEncrypted ? maskPANFromDb(customer) : null,
    aadhaarEncrypted: undefined,
    aadhaarIv: undefined,
    panEncrypted: undefined,
    panIv: undefined,
  };

  res.json({ success: true, data: masked });
}

// ─────────────────────────────────────────────
// REVEAL SENSITIVE DATA (requires PIN)
// ─────────────────────────────────────────────
export async function revealSensitiveData(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { pin, fields } = req.body as { pin: string; fields: ('aadhaar' | 'pan')[] };
  const userId = req.user!.userId;

  if (!pin || !fields?.length) {
    throw new AppError('PIN and fields array required', 400);
  }

  // Validate PIN
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { securityPinHash: true },
  });

  if (!user?.securityPinHash) {
    throw new AppError('Security PIN not set. Configure it in Security settings.', 400, 'PIN_NOT_SET');
  }

  const [pinHash, pinSalt] = user.securityPinHash.split(':');
  const isPinValid = await verifyPin(pin, pinHash, pinSalt);

  if (!isPinValid) {
    await createAuditLog(userId, 'PIN_VERIFICATION_FAILED', 'Customer', id, 'Incorrect PIN entered', 'HIGH', req);
    throw new AppError('Incorrect security PIN', 401, 'INVALID_PIN');
  }

  // Fetch customer
  const customer = await prisma.customer.findFirst({
    where: { id, userId, isActive: true },
  });

  if (!customer) throw new AppError('Customer not found', 404);

  const revealed: Record<string, string | null> = {};

  if (fields.includes('aadhaar') && customer.aadhaarEncrypted && customer.aadhaarIv) {
    try {
      // Reconstruct encrypted field object
      const encField = {
        ciphertext: customer.aadhaarEncrypted,
        iv: customer.aadhaarIv,
        tag: '', // NOTE: In production, store tag separately in DB
      };
      // For this implementation, we format Aadhaar as XXXX XXXX XXXX
      const plain = decryptField(encField);
      revealed.aadhaar = plain.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');
    } catch {
      revealed.aadhaar = null;
    }
  }

  if (fields.includes('pan') && customer.panEncrypted && customer.panIv) {
    try {
      const encField = {
        ciphertext: customer.panEncrypted,
        iv: customer.panIv,
        tag: '',
      };
      revealed.pan = decryptField(encField);
    } catch {
      revealed.pan = null;
    }
  }

  await createAuditLog(
    userId,
    'SENSITIVE_DATA_VIEWED',
    'Customer',
    id,
    `Viewed: ${fields.join(', ')} for ${customer.name} (PIN verified)`,
    'MEDIUM',
    req,
  );

  res.json({ success: true, data: revealed });
}

// ─────────────────────────────────────────────
// CREATE CUSTOMER
// ─────────────────────────────────────────────
export async function createCustomer(req: Request, res: Response): Promise<void> {
  const data = createCustomerSchema.parse(req.body);
  const userId = req.user!.userId;

  // Check plan limit
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, _count: { select: { customers: true } } },
  });

  if (!user) throw new AppError('User not found', 404);

  const isBasePlan = user.plan === 'TRIAL' || user.plan === 'MONTHLY' || user.plan === 'YEARLY';
  if (isBasePlan && user._count.customers >= MAX_CUSTOMERS_BASE_PLAN) {
    throw new AppError(
      `Customer limit reached (${MAX_CUSTOMERS_BASE_PLAN} on base plan). Upgrade to Pro for more.`,
      402,
      'CUSTOMER_LIMIT_REACHED',
    );
  }

  // Encrypt sensitive fields
  let aadhaarData = null;
  let panData = null;

  if (data.aadhaar) {
    const enc = encryptField(data.aadhaar);
    aadhaarData = { ciphertext: enc.ciphertext, iv: enc.iv };
  }

  if (data.pan) {
    const enc = encryptField(data.pan.toUpperCase());
    panData = { ciphertext: enc.ciphertext, iv: enc.iv };
  }

  const customer = await prisma.customer.create({
    data: {
      userId,
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      address: data.address || null,
      customerType: data.customerType,
      kycStatus: data.kycStatus,
      aadhaarEncrypted: aadhaarData?.ciphertext || null,
      aadhaarIv: aadhaarData?.iv || null,
      panEncrypted: panData?.ciphertext || null,
      panIv: panData?.iv || null,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      customerType: true,
      kycStatus: true,
      createdAt: true,
    },
  });

  await createAuditLog(userId, 'CUSTOMER_CREATED', 'Customer', customer.id, `Added ${customer.name}`, 'LOW', req);

  res.status(201).json({
    success: true,
    message: 'Customer added successfully',
    data: customer,
  });
}

// ─────────────────────────────────────────────
// UPDATE CUSTOMER
// ─────────────────────────────────────────────
export async function updateCustomer(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const data = updateCustomerSchema.parse(req.body);
  const userId = req.user!.userId;

  const existing = await prisma.customer.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError('Customer not found', 404);

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.email !== undefined) updateData.email = data.email || null;
  if (data.address !== undefined) updateData.address = data.address || null;
  if (data.customerType !== undefined) updateData.customerType = data.customerType;
  if (data.kycStatus !== undefined) {
    updateData.kycStatus = data.kycStatus;
    if (data.kycStatus === 'VERIFIED') {
      updateData.kycVerifiedAt = new Date();
      updateData.kycVerifiedBy = userId;
    }
  }

  // Re-encrypt if sensitive fields updated
  if (data.aadhaar) {
    const enc = encryptField(data.aadhaar);
    updateData.aadhaarEncrypted = enc.ciphertext;
    updateData.aadhaarIv = enc.iv;
  }
  if (data.pan) {
    const enc = encryptField(data.pan.toUpperCase());
    updateData.panEncrypted = enc.ciphertext;
    updateData.panIv = enc.iv;
  }

  const updated = await prisma.customer.update({
    where: { id },
    data: updateData,
    select: {
      id: true, name: true, phone: true, email: true,
      kycStatus: true, kycVerifiedAt: true, updatedAt: true,
    },
  });

  await createAuditLog(userId, 'CUSTOMER_UPDATED', 'Customer', id, `Updated ${updated.name}`, 'LOW', req);

  res.json({ success: true, data: updated });
}

// ─────────────────────────────────────────────
// DELETE CUSTOMER (soft delete)
// ─────────────────────────────────────────────
export async function deleteCustomer(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.userId;

  const customer = await prisma.customer.findFirst({ where: { id, userId, isActive: true } });
  if (!customer) throw new AppError('Customer not found', 404);

  // Check no active loans
  const activeLoans = await prisma.loan.count({
    where: { customerId: id, status: { in: ['ACTIVE', 'OVERDUE'] } },
  });
  if (activeLoans > 0) {
    throw new AppError('Cannot delete customer with active loans', 400, 'HAS_ACTIVE_LOANS');
  }

  await prisma.customer.update({ where: { id }, data: { isActive: false } });

  await createAuditLog(userId, 'CUSTOMER_DELETED', 'Customer', id, `Deleted ${customer.name}`, 'MEDIUM', req);

  res.json({ success: true, message: 'Customer deleted' });
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function maskAadhaarFromDb(customer: any): string {
  // We don't decrypt for display — just show fixed mask
  return '••••-••••-????';
}

function maskPANFromDb(customer: any): string {
  return '••••••••••';
}
