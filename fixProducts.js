require('dotenv').config();
const mongoose = require('mongoose');
const getDbForUser = require('./utils/getDbForUser');
const ProductModel = require('./models/Product');

const user = {
  username: 'alankrut',
  role: 'vendor',
  dbName: 'jewelleryDB'
};

const dryRun = false;

async function fixProducts() {
  const db = getDbForUser(user);
  const Product = db.model('Product', ProductModel.schema);

  console.log(`\n🔌 Connected to DB: ${user.dbName}`);

  const query = {
    $or: [
      { _id: { $type: 'string' } },
      { createdAt: { $type: 'string' } },
      { updatedAt: { $type: 'string' } }
    ]
  };

  const products = await Product.find(query).lean(); // plain JS objects

  console.log(`\n📦 Found ${products.length} products with wrong types\n`);

  let updated = 0;
  for (const p of products) {
    const updates = {};
    let needsNewId = false;

    let newId = p._id;
    if (typeof newId === 'string' && mongoose.Types.ObjectId.isValid(newId)) {
      newId = new mongoose.Types.ObjectId(newId);
      needsNewId = true;
      console.log(`🆔 "${p.name}" will get ObjectId`);
    }

    if (typeof p.createdAt === 'string') {
      updates.createdAt = new Date(p.createdAt);
    }

    if (typeof p.updatedAt === 'string') {
      updates.updatedAt = new Date(p.updatedAt);
    }

    if (needsNewId) {
      const { _id, ...rest } = p;
      const newDoc = { _id: newId, ...rest, ...updates };

      if (dryRun) {
        console.log(`🧪 Would recreate "${p.name}" with fixed _id and dates`);
      } else {
        await Product.create(newDoc);
        await Product.deleteOne({ _id: p._id });
        console.log(`✅ Recreated "${p.name}"`);
      }
    } else if (Object.keys(updates).length > 0) {
      if (dryRun) {
        console.log(`🧪 Would update "${p.name}" with fixed dates`);
      } else {
        await Product.updateOne({ _id: p._id }, { $set: updates });
        console.log(`✅ Updated "${p.name}"`);
      }
    } else {
      console.log(`ℹ️  No changes needed for "${p.name}"`);
      continue;
    }

    updated++;
  }

  console.log(`\n📊 Summary:`);
  console.log(`- Found: ${products.length}`);
  console.log(`- Updated: ${updated}`);
  console.log(`- Mode: ${dryRun ? 'Dry Run (no DB changes)' : 'Live Update (changes applied)'}`);

  process.exit();
}

fixProducts();
