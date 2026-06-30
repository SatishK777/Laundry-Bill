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

const demoNames = [
  "Asha Laundry",
  "Bright Wash",
  "City Cleaners",
  "Dhobi Express",
  "Easy Iron",
  "Fresh Fold",
  "Ganga Laundry",
  "Happy Wash",
  "Ideal Press",
  "Jai Clean",
  "Krishna Laundry",
  "Lucky Press",
  "Modern Wash",
  "Narmada Clean",
  "Om Sai Laundry",
  "Prabhat Press",
  "Quick Wash",
  "Riya Laundry",
  "Sunrise Clean",
  "Tiranga Wash",
  "Balaji Laundry",
  "Champaran Cleaners",
  "Deepak Press",
  "Express Dry Cleaners",
  "Golden Wash",
  "Hari Om Dhobi",
  "Laxmi Laundry",
  "Royal Press",
  "Star Wash",
  "White Shine"
];

const isoDate = (d) => d.toISOString().slice(0, 10);

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB for seeding demo data...");

  // 1. Ensure all 30 customers exist
  const customers = [];
  for (const name of demoNames) {
    let customer = await Customer.findOne({ name });
    if (!customer) {
      customer = await Customer.create({ name });
    }
    customers.push(customer);
  }
  console.log(`Ensured ${customers.length} shop customers exist.`);

  const common = await Common.findOne();
  if (!common) {
    console.log("No common rate found. Creating default...");
    await Common.create({ label: "Common", rate: 5 });
  }
  const rates = await Rate.find();
  if (rates.length === 0) {
    console.log("No special rates found. Creating defaults...");
    await Rate.insertMany([
      { en: "Saree", hi: "साड़ी", rate: 15 },
      { en: "Dhoti", hi: "धोती", rate: 12 },
      { en: "Blanket", hi: "कंबल", rate: 25 },
      { en: "Chadar", hi: "चादर", rate: 10 },
      { en: "Gown", hi: "गाउन", rate: 18 },
      { en: "Chaniya", hi: "चनिया", rate: 16 },
      { en: "Curtains", hi: "परदे", rate: 20 },
    ]);
  }
  const updatedRates = await Rate.find();
  const updatedCommon = await Common.findOne();

  // 2. Clear existing entries for June 2026 to ensure clean seeding
  console.log("Clearing existing entries for June 2026...");
  await Entry.deleteMany({ date: /^2026-06/ });

  // 3. Generate dates for June 1 to June 30, 2026
  const dates = [];
  for (let day = 1; day <= 30; day += 1) {
    const dayStr = String(day).padStart(2, "0");
    dates.push(`2026-06-${dayStr}`);
  }

  let createdCount = 0;
  
  // 4. For each date, generate entries for 25-28 random shops
  for (const date of dates) {
    const targetCount = randomInt(25, 28);
    // Shuffle customers
    const shuffledShops = [...customers].sort(() => Math.random() - 0.5);
    const activeShops = shuffledShops.slice(0, targetCount);

    console.log(`Seeding date ${date} with ${targetCount} active shops...`);

    for (const customer of activeShops) {
      const exists = await Entry.findOne({ laundryId: customer._id, date });
      if (exists) continue;

      const items = {};
      if (updatedRates.length > 0) {
        // Randomly select 1 to 3 special items
        const sampleCount = randomInt(1, 3);
        const shuffledRates = [...updatedRates].sort(() => Math.random() - 0.5);
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

  console.log(`Demo seed done. New entries created: ${createdCount}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
