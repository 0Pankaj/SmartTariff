/**
 * backend-node/scripts/migrate-sqlite-to-postgres.js
 *
 * Deterministic, safe, transactional ETL migration from SQLite source to PostgreSQL.
 * Uses createMany to insert records per table in batch, ensuring ultra-fast and atomic table imports
 * with maxWait: 20000, timeout: 120000.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { prisma } = require('../src/config/db');

const DUMP_PATH = path.join(__dirname, 'sqlite_dump.json');

function parseBoolean(val, defaultVal = false) {
  if (val === null || val === undefined) return defaultVal;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val === 1;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    if (s === '1' || s === 'true') return true;
    if (s === '0' || s === 'false') return false;
  }
  return defaultVal;
}

function parseDate(val) {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

async function runMigration() {
  console.log('====================================================');
  console.log('🚀 Starting SQLite ➔ PostgreSQL Data Migration');
  console.log('====================================================\n');

  if (!fs.existsSync(DUMP_PATH)) {
    throw new Error(`Data dump not found at: ${DUMP_PATH}`);
  }

  const data = JSON.parse(fs.readFileSync(DUMP_PATH, 'utf-8'));
  const tables = [
    'users',
    'tariff_plans',
    'customer_profiles',
    'usages',
    'recommendations',
    'recommendation_plans',
    'feedbacks',
  ];

  // 1. Verify PostgreSQL tables are currently empty
  console.log('🔍 Checking target PostgreSQL tables...');
  for (const table of tables) {
    const countRes = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as c FROM "${table}"`);
    const count = countRes[0].c;
    if (count > 0) {
      throw new Error(`Safety check failed: Table "${table}" already contains ${count} rows! Aborting to prevent silent overwrite.`);
    }
  }
  console.log('✅ PostgreSQL is confirmed empty (0 rows across all application tables).\n');

  // Prepare batch payloads
  const usersData = data.users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    password: u.password,
    phone: u.phone || '',
    role: u.role,
    avatar: u.avatar || null,
    isActive: parseBoolean(u.is_active, true),
    createdAt: parseDate(u.created_at) || new Date(),
    updatedAt: parseDate(u.updated_at) || new Date(),
  }));

  const tariffPlansData = data.tariff_plans.map(p => ({
    id: p.id,
    planCode: p.plan_code || null,
    name: p.name,
    operator: p.operator || '',
    category: p.category || 'Standard',
    price: Number(p.price),
    monthlyEquivalent: p.monthly_equivalent !== null ? Number(p.monthly_equivalent) : null,
    durationMonths: p.duration_months !== null ? Number(p.duration_months) : 1,
    validity: Number(p.validity),
    dataLimit: p.data_limit !== null ? Number(p.data_limit) : null,
    callMinutes: p.call_minutes !== null ? Number(p.call_minutes) : null,
    smsLimit: p.sms_limit !== null ? Number(p.sms_limit) : null,
    offerType: p.offer_type || 'Standalone',
    individualCost: p.individual_cost !== null ? Number(p.individual_cost) : null,
    discountInr: p.discount_inr !== null ? Number(p.discount_inr) : 0.0,
    discountPercent: p.discount_percent !== null ? Number(p.discount_percent) : 0.0,
    fiveG: parseBoolean(p.five_g, false),
    description: p.description || '',
    benefits: p.benefits || '[]',
    image: p.image || null,
    popularity: p.popularity !== null ? Number(p.popularity) : 0,
    isActive: parseBoolean(p.is_active, true),
    createdAt: parseDate(p.created_at) || new Date(),
    updatedAt: parseDate(p.updated_at) || new Date(),
  }));

  const customerProfilesData = data.customer_profiles.map(cp => ({
    id: cp.id,
    userId: cp.user_id,
    currentPlanId: cp.current_plan_id || null,
    monthlyBudget: cp.monthly_budget !== null ? Number(cp.monthly_budget) : 500,
    minimumData: cp.minimum_data !== null ? Number(cp.minimum_data) : 10,
    minimumCallMinutes: cp.minimum_call_minutes !== null ? Number(cp.minimum_call_minutes) : 500,
    minimumSms: cp.minimum_sms !== null ? Number(cp.minimum_sms) : 100,
    preferredDuration: cp.preferred_duration || '28',
    requires5G: parseBoolean(cp.requires_5g, false),
    preferredOperator: cp.preferred_operator || '',
    createdAt: parseDate(cp.created_at) || new Date(),
    updatedAt: parseDate(cp.updated_at) || new Date(),
  }));

  const usagesData = data.usages.map(u => ({
    id: u.id,
    customerId: u.customer_id,
    dataUsage: Number(u.data_usage),
    callMinutes: Number(u.call_minutes),
    smsCount: Number(u.sms_count),
    numberOfCalls: u.number_of_calls !== null ? Number(u.number_of_calls) : 0,
    averageCallDuration: u.average_call_duration !== null ? Number(u.average_call_duration) : 0,
    month: u.month,
    createdAt: parseDate(u.created_at) || new Date(),
    updatedAt: parseDate(u.updated_at) || new Date(),
  }));

  const recommendationsData = data.recommendations.map(r => ({
    id: r.id,
    customerId: r.customer_id,
    inputSnapshot: r.input_snapshot || '{}',
    generatedBy: r.generated_by || 'rule-based',
    generatedAt: parseDate(r.generated_at) || new Date(),
    createdAt: parseDate(r.created_at) || new Date(),
    updatedAt: parseDate(r.updated_at) || new Date(),
  }));

  const recommendationPlansData = data.recommendation_plans.map(rp => ({
    id: rp.id,
    recommendationId: rp.recommendation_id,
    planId: rp.plan_id,
    rank: Number(rp.rank),
    score: Number(rp.score),
    reasons: rp.reasons || '[]',
  }));

  const feedbacksData = data.feedbacks.map(fb => ({
    id: fb.id,
    customerId: fb.customer_id,
    recommendationId: fb.recommendation_id,
    rating: Number(fb.rating),
    comment: fb.comment || '',
    createdAt: parseDate(fb.created_at) || new Date(),
    updatedAt: parseDate(fb.updated_at) || new Date(),
  }));

  // 2. Perform Migration within Prisma Transaction using createMany
  console.log('📦 Beginning fast transactional batch migration...');
  const startTime = Date.now();

  await prisma.$transaction(async (tx) => {
    console.log(`\n⏳ Migrating users (${usersData.length} records)...`);
    const rUsers = await tx.user.createMany({ data: usersData });
    console.log(`✅ Migrated ${rUsers.count} users.`);

    console.log(`\n⏳ Migrating tariff_plans (${tariffPlansData.length} records)...`);
    const rPlans = await tx.tariffPlan.createMany({ data: tariffPlansData });
    console.log(`✅ Migrated ${rPlans.count} tariff_plans.`);

    console.log(`\n⏳ Migrating customer_profiles (${customerProfilesData.length} records)...`);
    const rProfiles = await tx.customerProfile.createMany({ data: customerProfilesData });
    console.log(`✅ Migrated ${rProfiles.count} customer_profiles.`);

    console.log(`\n⏳ Migrating usages (${usagesData.length} records)...`);
    const rUsages = await tx.usage.createMany({ data: usagesData });
    console.log(`✅ Migrated ${rUsages.count} usages.`);

    console.log(`\n⏳ Migrating recommendations (${recommendationsData.length} records)...`);
    const rRecs = await tx.recommendation.createMany({ data: recommendationsData });
    console.log(`✅ Migrated ${rRecs.count} recommendations.`);

    console.log(`\n⏳ Migrating recommendation_plans (${recommendationPlansData.length} records)...`);
    const rRecPlans = await tx.recommendationPlan.createMany({ data: recommendationPlansData });
    console.log(`✅ Migrated ${rRecPlans.count} recommendation_plans.`);

    console.log(`\n⏳ Migrating feedbacks (${feedbacksData.length} records)...`);
    const rFeedbacks = await tx.feedback.createMany({ data: feedbacksData });
    console.log(`✅ Migrated ${rFeedbacks.count} feedbacks.`);
  }, {
    maxWait: 20000,
    timeout: 120000,
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n🎉 Data migration committed successfully in ${duration}s!`);

  // 3. Reset/synchronize PostgreSQL sequences so auto-increment IDs stay valid
  console.log('\n⚙️ Synchronizing PostgreSQL sequences to prevent ID collisions...');
  for (const table of tables) {
    const seqResult = await prisma.$queryRawUnsafe(`
      SELECT pg_get_serial_sequence('"${table}"', 'id') AS seq_name;
    `);
    const seqName = seqResult[0]?.seq_name;
    if (seqName) {
      await prisma.$queryRawUnsafe(`
        SELECT setval('${seqName}', COALESCE((SELECT MAX(id) FROM "${table}"), 1), true);
      `);
      const valRes = await prisma.$queryRawUnsafe(`SELECT last_value FROM ${seqName}`);
      console.log(`   ${table} sequence (${seqName}) set to ${valRes[0].last_value}`);
    }
  }

  console.log('\n====================================================');
  console.log('✅ SQLite ➔ PostgreSQL Migration Completed Successfully!');
  console.log('====================================================');
}

if (require.main === module) {
  runMigration()
    .catch((err) => {
      console.error('\n❌ MIGRATION FAILED:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { runMigration };
