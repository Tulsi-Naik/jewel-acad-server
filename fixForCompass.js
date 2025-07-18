/**
 * 📦 fixForCompass.js
 * --------------------
 * 🧠 Why this script exists:
 * MongoDB Compass (and `mongoimport`) will store values *exactly as-is* from a JSON file.
 * That means:
 * - String `_id`s will be stored as strings, not ObjectId
 * - Date fields like `createdAt`, `invoiceDate` will be stored as strings, not ISODate
 * 
 * ❌ These cause silent bugs:
 * - `Product.findById(...)` fails because `_id` is a string
 * - Date filters don’t work because Mongo compares strings instead of dates
 * 
 * ✅ This script fixes those issues by:
 * - Converting `_id` fields to `ObjectId`
 * - Converting all date fields to proper `Date` objects
 *
 * --------------------------------------------------
 * 🚀 HOW TO USE:
 * 1. Place your raw JSON file as: `scripts/raw-products.json`
 * 2. Run this script:
 *      node scripts/fixForCompass.js
 * 3. It will generate: `scripts/fixed-products.json`
 * 4. Import `fixed-products.json` into MongoDB Compass or via `mongoimport`
 *
 * 🔐 DO NOT import raw JSON directly into Compass — it will store incorrect types!
 * 
 * --------------------------------------------------
 * 👥 For future developers:
 * Always sanitize any JSON file before importing, especially in dev/test resets.
 * This avoids hidden bugs and keeps data consistent with production expectations.
 */
/**
 * ✅ fixForCompass.js
 * --------------------
 * Purpose:
 * This script prepares raw JSON data for safe import into MongoDB Compass.
 * It converts `_id` fields from string to ObjectId,
 * and converts `date` fields from string to proper Date objects.
 *
 * ⚠️ MongoDB Compass DOES NOT auto-convert types during import.
 *    This script prevents silent bugs caused by incorrect types.
 *
 * 📂 Place your raw JSON file as: scripts/raw-products.json
 * 🛠  Run the script using:      node scripts/fixForCompass.js
 * 📁 Output file will be:        scripts/fixed-products.json
 *
 * ✅ Then import the output file into Compass.
 */

const fs = require('fs');
const path = require('path');
const { ObjectId } = require('mongodb');

// Change these if needed
const inputFile = path.join(__dirname, 'raw-products.json');      // Raw JSON file to process
const outputFile = path.join(__dirname, 'fixed-products.json');   // Output file after fixing

// Read and parse raw JSON file
const raw = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));

// Go through each document and fix _id and date fields
const fixed = raw.map((doc, index) => {
  const clean = { ...doc };

  /**
   * 🔄 Convert _id from string to ObjectId
   * MongoDB expects _id to be an ObjectId by default
   * String-based _id will break relational queries and indexes
   */
  if (typeof clean._id === 'string') {
    try {
      clean._id = new ObjectId(clean._id);
    } catch (e) {
      console.warn(`⚠️ Skipping invalid _id at index ${index}: ${clean._id}`);
      delete clean._id; // Remove if invalid to let MongoDB auto-generate one
    }
  }

  /**
   * 🕒 Convert createdAt (or other date fields) from string to Date
   * Compass does not auto-convert these, so do it manually
   */
  if (typeof clean.createdAt === 'string') {
    clean.createdAt = new Date(clean.createdAt);
  }

  // Add more conversions as needed for your schema
  if (typeof clean.updatedAt === 'string') {
    clean.updatedAt = new Date(clean.updatedAt);
  }

  if (typeof clean.invoiceDate === 'string') {
    clean.invoiceDate = new Date(clean.invoiceDate);
  }

  if (typeof clean.date === 'string') {
    clean.date = new Date(clean.date);
  }

  return clean;
});

// Save the cleaned and type-corrected JSON file
fs.writeFileSync(outputFile, JSON.stringify(fixed, null, 2));
console.log(`✅ Cleaned JSON saved to ${outputFile}`);
