require("dotenv").config();
const mongoose = require("mongoose");

const { Schema } = mongoose;

const CustomerSchema = new Schema({
  name: { type: String, required: true, trim: true },
});

const CommonSchema = new Schema({
  label: { type: String, required: true },
  rate: { type: Number, required: true, min: 0 },
});

const RateSchema = new Schema({
  en: { type: String, required: true },
  hi: { type: String, required: true },
  rate: { type: Number, required: true, min: 0 },
});

const EntrySchema = new Schema({
  laundryId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
  date: { type: String, required: true },
  commonQty: { type: Number, default: 0 },
  items: { type: Map, of: Number, default: {} },
}, { timestamps: true });

EntrySchema.index({ laundryId: 1, date: 1 }, { unique: true });

const Customer = mongoose.model("Customer", CustomerSchema);
const Common = mongoose.model("Common", CommonSchema);
const Rate = mongoose.model("Rate", RateSchema);
const Entry = mongoose.model("Entry", EntrySchema);

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB for seeding demo data...");

  // 1. Fetch existing customers from the database (retaining your real customers)
  const customers = await Customer.find();
  console.log(`Found ${customers.length} existing customers in database.`);

  if (customers.length === 0) {
    console.error("No customers found in database! Please add some customers first.");
    await mongoose.disconnect();
    process.exit(1);
  }

  // 2. Fetch rates
  const rates = await Rate.find();
  console.log(`Found ${rates.length} special items in database.`);

  // 3. Clear existing entries for June 2026 to ensure clean seeding
  console.log("Clearing existing entries for June 2026...");
  const deleteResult = await Entry.deleteMany({ date: /^2026-06/ });
  console.log(`Cleared ${deleteResult.deletedCount} existing entries.`);

  // 4. Generate dates for June 1 to June 30, 2026
  const dates = [];
  for (let day = 1; day <= 30; day += 1) {
    const dayStr = String(day).padStart(2, "0");
    dates.push(`2026-06-${dayStr}`);
  }

  let createdCount = 0;

  // 5. For each date, generate entries for a subset of the real customers
  for (const date of dates) {
    // 80% to 95% of your real customers will have entries on any given day
    const activityPercentage = randomInt(80, 95);
    const targetCount = Math.max(1, Math.floor((customers.length * activityPercentage) / 100));
    
    // Shuffle customers
    const shuffledShops = [...customers].sort(() => Math.random() - 0.5);
    const activeShops = shuffledShops.slice(0, targetCount);

    console.log(`Seeding date ${date} with ${targetCount} active shops...`);

    for (const customer of activeShops) {
      const exists = await Entry.findOne({ laundryId: customer._id, date });
      if (exists) continue;

      const items = {};
      if (rates.length > 0) {
        // Randomly select 1 to 3 special items
        const sampleCount = randomInt(1, Math.min(3, rates.length));
        const shuffledRates = [...rates].sort(() => Math.random() - 0.5);
        for (let i = 0; i < sampleCount; i += 1) {
          items[shuffledRates[i]._id.toString()] = randomInt(1, 5);
        }
      }

      await Entry.create({
        laundryId: customer._id,
        date,
        commonQty: randomInt(2, 10), // Random common items between 2 and 10
        items,
      });
      createdCount += 1;
    }
  }

  console.log(`Demo seed done. New entries created for real customers: ${createdCount}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
