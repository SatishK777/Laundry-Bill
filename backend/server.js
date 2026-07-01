require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

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

const defaultSeed = {
  customers: ["prakash", "umesh", "bihari", "ramji"],
  common: { label: "Common", rate: 5 },
  rates: [
    { en: "Saree", hi: "साड़ी", rate: 15 },
    { en: "Dhoti", hi: "धोती", rate: 12 },
    { en: "Blanket", hi: "कंबल", rate: 25 },
    { en: "Chadar", hi: "चादर", rate: 10 },
    { en: "Gown", hi: "गाउन", rate: 18 },
    { en: "Chaniya", hi: "चनिया", rate: 16 },
    { en: "Curtains", hi: "परदे", rate: 20 },
  ],
};

async function seedIfEmpty() {
  const count = await Customer.countDocuments();
  if (count === 0) {
    await Customer.insertMany(defaultSeed.customers.map((name) => ({ name })));
  }
  const commonCount = await Common.countDocuments();
  if (commonCount === 0) {
    await Common.create(defaultSeed.common);
  }
  const rateCount = await Rate.countDocuments();
  if (rateCount === 0) {
    await Rate.insertMany(defaultSeed.rates);
  }
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/customers", async (req, res) => {
  const customers = await Customer.find().sort({ _id: 1 });
  res.json(customers);
});

app.post("/api/customers", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });
  const customer = await Customer.create({ name });
  res.json(customer);
});

app.delete("/api/customers/:id", async (req, res) => {
  await Customer.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

app.get("/api/common", async (req, res) => {
  const common = await Common.findOne();
  res.json(common);
});

app.put("/api/common", async (req, res) => {
  const { label, rate } = req.body;
  const common = await Common.findOne();
  if (!common) {
    const created = await Common.create({ label, rate });
    return res.json(created);
  }
  common.label = label;
  common.rate = rate;
  await common.save();
  res.json(common);
});

app.get("/api/rates", async (req, res) => {
  const rates = await Rate.find();
  res.json(rates);
});

app.post("/api/rates", async (req, res) => {
  const { en, hi, rate } = req.body;
  if (!en || !hi) return res.status(400).json({ error: "Names required" });
  const item = await Rate.create({ en, hi, rate });
  res.json(item);
});

app.delete("/api/rates/:id", async (req, res) => {
  await Rate.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

app.get("/api/entries", async (req, res) => {
  const { laundryId, month } = req.query;
  const query = {};
  if (laundryId) query.laundryId = laundryId;
  if (month) query.date = new RegExp(`^${month}`);
  const entries = await Entry.find(query);
  res.json(entries);
});

app.post("/api/entries", async (req, res) => {
  const { laundryId, date, commonQty, items } = req.body;
  if (!laundryId || !date) return res.status(400).json({ error: "Laundry and date required" });
  const exists = await Entry.findOne({ laundryId, date });
  if (exists) {
    return res.status(409).json({ error: "Entry already exists for this customer and date" });
  }
  try {
    const entry = await Entry.create({
      laundryId,
      date,
      commonQty: Number(commonQty || 0),
      items: items || {},
    });
    res.json(entry);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: "Entry already exists for this customer and date" });
    }
    throw err;
  }
});

app.delete("/api/entries/:id", async (req, res) => {
  await Entry.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

app.get("/api/bill", async (req, res) => {
  const { laundryId, month } = req.query;
  if (!laundryId || !month) return res.status(400).json({ error: "Laundry and month required" });

  const customer = await Customer.findById(laundryId);
  const common = await Common.findOne();
  const rates = await Rate.find();
  const entries = await Entry.find({ laundryId, date: new RegExp(`^${month}`) });

  let commonQty = 0;
  const itemTotals = {};

  entries.forEach((e) => {
    commonQty += Number(e.commonQty || 0);
    if (e.items) {
      for (const [id, qty] of e.items.entries()) {
        itemTotals[id] = (itemTotals[id] || 0) + Number(qty || 0);
      }
    }
  });

  const rows = [];
  let totalAmount = 0;

  let activeCommonRate = Number(common?.rate || 0);
  if (customer) {
    const name = customer.name.replace(/\s+/g, "").toLowerCase();
    if (name === "shriram" || (name.includes("shri") && name.includes("ram")) || name === "sachin") {
      activeCommonRate = 3;
    } else if (name === "umesh") {
      activeCommonRate = 3.5;
    }
  }

  if (commonQty > 0) {
    const amount = commonQty * activeCommonRate;
    totalAmount += amount;
    rows.push({ name: "Common", qty: commonQty, amount });
  }

  rates.forEach((item) => {
    const qty = itemTotals[item._id.toString()] || 0;
    if (qty > 0) {
      const amount = qty * Number(item.rate || 0);
      totalAmount += amount;
      rows.push({ name: `${item.en} (${item.hi})`, qty, amount });
    }
  });

  res.json({
    customer: customer ? customer.name : "",
    month,
    rows,
    totalAmount,
  });
});

const path = require("path");

// Serve static assets from the React production build
app.use(express.static(path.join(__dirname, "../frontend/dist")));

// Catch-all route to serve the React SPA index.html for non-API routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
});

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    await seedIfEmpty();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error", err);
    process.exit(1);
  });
