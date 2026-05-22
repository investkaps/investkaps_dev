/**
 * Migration: Backfill verificationStatus flags for existing users.
 *
 * Run once after deploying the new User schema:
 *   node backend/scripts/migrateVerificationStatus.js
 *
 * What it does:
 *   1. verificationStatus.panKyc  ← kycStatus.isVerified (already stored)
 *   2. verificationStatus.phone   ← profile.phoneVerified (already stored)
 *   3. verificationStatus.esign   ← checks if any Document with COMPLETED esign exists for user
 *
 * Safe to re-run — uses $set so existing true values are not overwritten.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('❌  MONGO_URI not found in environment. Aborting.');
  process.exit(1);
}

await mongoose.connect(MONGO_URI);
console.log('✅  Connected to MongoDB');

const User     = (await import('../model/User.js')).default;
const Document = (await import('../model/Document.js')).default;

const users = await User.find({}).select(
  '_id kycStatus.isVerified profile.phoneVerified verificationStatus clientTypes'
);

console.log(`🔄  Migrating ${users.length} users...`);

let updated = 0;
let skipped = 0;

for (const user of users) {
  const vs = user.verificationStatus || {};

  // 1. panKyc — derive from kycStatus.isVerified
  const panKyc = vs.panKyc !== null && vs.panKyc !== undefined
    ? vs.panKyc  // already set — keep it
    : (user.kycStatus?.isVerified === true ? true : null);

  // 2. phone — derive from profile.phoneVerified
  const phone = vs.phone !== null && vs.phone !== undefined
    ? vs.phone
    : (user.profile?.phoneVerified === true ? true : null);

  // 3. esign — check Document collection for a COMPLETED esign
  let esign = vs.esign !== null && vs.esign !== undefined ? vs.esign : null;
  if (esign === null) {
    const completedDoc = await Document.findOne({
      user: user._id,
      'esign.status': { $in: ['COMPLETED', 'completed'] }
    }).select('_id');
    if (completedDoc) esign = true;
  }

  // Skip if nothing would change
  if (
    vs.panKyc === panKyc &&
    vs.phone  === phone  &&
    vs.esign  === esign
  ) {
    skipped++;
    continue;
  }

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        'verificationStatus.panKyc': panKyc,
        'verificationStatus.phone':  phone,
        'verificationStatus.esign':  esign,
      }
    }
  );
  updated++;

  if (updated % 50 === 0) {
    console.log(`   ...processed ${updated} updates so far`);
  }
}

console.log(`\n✅  Migration complete`);
console.log(`   Updated : ${updated}`);
console.log(`   Skipped : ${skipped} (already set)`);

await mongoose.disconnect();
process.exit(0);
