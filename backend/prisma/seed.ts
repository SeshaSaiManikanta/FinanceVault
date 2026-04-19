// VaultFinance — Database Seed
// Run: npx prisma db seed
// © 2025 VaultFinance. All Rights Reserved.

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding VaultFinance database...');

  // ─── Admin user ───
  const adminHash = await bcrypt.hash('Admin@Vault2025!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@vaultfinance.com' },
    update: {},
    create: {
      email: 'admin@vaultfinance.com',
      passwordHash: adminHash,
      name: 'VaultFinance Admin',
      companyName: 'VaultFinance HQ',
      role: 'ADMIN',
      plan: 'ENTERPRISE',
      emailVerified: true,
    } as any,
  });
  console.log('✅ Admin user created:', admin.email);

  // ─── Demo finance user ───
  const demoHash = await bcrypt.hash('Demo@123!', 12);
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@sriramnance.com' },
    update: {},
    create: {
      email: 'demo@sriramnance.com',
      passwordHash: demoHash,
      name: 'Ravi Shankar',
      companyName: 'Sri Ram Finance',
      phone: '9876543210',
      role: 'USER',
      plan: 'TRIAL',
      trialEndsAt: new Date(Date.now() + 30 * 86400000),
      emailVerified: true,
    },
  });
  console.log('✅ Demo user created:', demoUser.email);

  // ─── Loan Types ───
  const loanTypes = [
    {
      name: 'Gold Loan',
      slug: 'gold',
      icon: '🪙',
      color: '#BA7517',
      description: 'Against gold jewellery, coins & bars. Quick disbursal, flexible tenure.',
      minRate: 10,
      maxRate: 18,
      defaultRate: 14,
      sortOrder: 1,
      assetFields: [
        { key: 'weight', label: 'Gold Weight (grams)', type: 'number', placeholder: '50' },
        { key: 'purity', label: 'Purity (carats)', type: 'select', options: ['22 ct', '18 ct', '24 ct'] },
        { key: 'marketValue', label: 'Market Value (₹)', type: 'number', placeholder: '180000' },
        { key: 'ltv', label: 'LTV Ratio (%)', type: 'number', placeholder: 'Auto-calculated', readonly: true },
        { key: 'ornamentType', label: 'Ornament Type', type: 'select', options: ['Necklace', 'Bangles', 'Ring', 'Earrings', 'Coins', 'Bar', 'Other'] },
      ],
      tenureOptions: [3, 6, 12, 18, 24],
    },
    {
      name: 'Vehicle Loan',
      slug: 'vehicle',
      icon: '🚗',
      color: '#185FA5',
      description: 'Two-wheelers, cars & commercial vehicles.',
      minRate: 10,
      maxRate: 16,
      defaultRate: 12,
      sortOrder: 2,
      assetFields: [
        { key: 'vehicleType', label: 'Vehicle Type', type: 'select', options: ['Two-Wheeler', 'Car', 'Commercial Vehicle', 'Three-Wheeler'] },
        { key: 'makeModel', label: 'Make & Model', type: 'text', placeholder: 'Honda Activa 6G' },
        { key: 'year', label: 'Year of Manufacture', type: 'number', placeholder: '2022' },
        { key: 'rcNumber', label: 'RC / Chassis No.', type: 'text', placeholder: 'KA01AB1234' },
        { key: 'insurance', label: 'Insurance Valid Till', type: 'date', placeholder: '' },
      ],
      tenureOptions: [12, 24, 36, 48, 60],
    },
    {
      name: 'Personal Loan',
      slug: 'personal',
      icon: '👤',
      color: '#534AB7',
      description: 'Unsecured personal finance for salaried & self-employed.',
      minRate: 14,
      maxRate: 24,
      defaultRate: 18,
      sortOrder: 3,
      assetFields: [
        { key: 'purpose', label: 'Loan Purpose', type: 'select', options: ['Medical', 'Education', 'Home Improvement', 'Wedding', 'Travel', 'Debt Consolidation', 'Other'] },
        { key: 'monthlyIncome', label: 'Monthly Income (₹)', type: 'number', placeholder: '25000' },
        { key: 'employmentType', label: 'Employment Type', type: 'select', options: ['Salaried', 'Self-Employed', 'Business Owner', 'Freelancer'] },
        { key: 'employer', label: 'Employer / Business Name', type: 'text', placeholder: 'ABC Pvt Ltd' },
      ],
      tenureOptions: [6, 12, 18, 24, 36],
    },
    {
      name: 'Property Loan',
      slug: 'property',
      icon: '🏠',
      color: '#0F6E56',
      description: 'Loan against residential or commercial property.',
      minRate: 9,
      maxRate: 14,
      defaultRate: 11,
      sortOrder: 4,
      assetFields: [
        { key: 'propertyType', label: 'Property Type', type: 'select', options: ['Residential', 'Commercial', 'Agricultural', 'Industrial'] },
        { key: 'propertyAddress', label: 'Property Address', type: 'text', placeholder: 'Survey No., Village, District, State' },
        { key: 'marketValue', label: 'Market Value (₹)', type: 'number', placeholder: '2000000' },
        { key: 'registrationNo', label: 'Registration Number', type: 'text', placeholder: 'SRO/2020/001234' },
        { key: 'ownerName', label: "Owner's Name (as per document)", type: 'text', placeholder: 'Rajesh Kumar' },
      ],
      tenureOptions: [12, 24, 36, 48, 60, 84, 120],
    },
    {
      name: 'Business Loan',
      slug: 'business',
      icon: '🏢',
      color: '#993C1D',
      description: 'Working capital and MSME business finance.',
      minRate: 13,
      maxRate: 20,
      defaultRate: 16,
      sortOrder: 5,
      assetFields: [
        { key: 'businessName', label: 'Business Name', type: 'text', placeholder: 'Sri Lakshmi Traders' },
        { key: 'businessType', label: 'Business Type', type: 'select', options: ['Sole Proprietor', 'Partnership', 'Private Limited', 'LLP', 'OPC'] },
        { key: 'gstNumber', label: 'GST Number', type: 'text', placeholder: '29ABCDE1234F1Z5' },
        { key: 'annualTurnover', label: 'Annual Turnover (₹)', type: 'number', placeholder: '500000' },
        { key: 'loanPurpose', label: 'Loan Purpose', type: 'select', options: ['Working Capital', 'Equipment Purchase', 'Expansion', 'Inventory', 'Other'] },
      ],
      tenureOptions: [6, 12, 24, 36, 48],
    },
  ];

  for (const lt of loanTypes) {
    await prisma.loanType.upsert({
      where: { slug: lt.slug },
      update: {},
      create: { ...lt, assetFields: JSON.stringify(lt.assetFields), tenureOptions: JSON.stringify(lt.tenureOptions) } as any,
    });
    console.log(`✅ Loan type: ${lt.name}`);
  }

  // ─── Sample customer for demo user ───
  const sampleCustomer = await prisma.customer.upsert({
    where: { id: 'sample-customer-1' },
    update: {},
    create: {
      id: 'sample-customer-1',
      userId: demoUser.id,
      name: 'Meena Pillai',
      phone: '9845001122',
      email: 'meena@example.com',
      address: 'Anna Nagar, Chennai - 600040',
      customerType: 'INDIVIDUAL',
      kycStatus: 'VERIFIED',
      kycVerifiedAt: new Date(),
    },
  });
  console.log('✅ Sample customer created');

  console.log('\n🎉 Seed complete!');
  console.log('─────────────────────────────────────');
  console.log('Admin login:');
  console.log('  Email: admin@vaultfinance.com');
  console.log('  Password: Admin@Vault2025!');
  console.log('\nDemo user login:');
  console.log('  Email: demo@sriramnance.com');
  console.log('  Password: Demo@123!');
  console.log('─────────────────────────────────────');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
