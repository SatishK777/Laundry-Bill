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

const EntrySchema = new Schema(
  {
    laundryId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    date: { type: String, required: true },
    commonQty: { type: Number, default: 0 },
    items: { type: Map, of: Number, default: {} },
  },
  { timestamps: true },
);

EntrySchema.index({ laundryId: 1, date: 1 }, { unique: true });

const Customer = mongoose.model("Customer", CustomerSchema);
const Common = mongoose.model("Common", CommonSchema);
const Rate = mongoose.model("Rate", RateSchema);
const Entry = mongoose.model("Entry", EntrySchema);

const defaultSeed = {
  customers: ["prakash", "umesh", "bihari", "ramji"],
  common: { label: "Common", rate: 4 },
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

app.post("/api/entries/shift-date", async (req, res) => {
  const { oldDate, newDate } = req.body;
  if (!oldDate || !newDate) {
    return res.status(400).json({ error: "oldDate and newDate are required" });
  }
  if (oldDate === newDate) {
    return res.status(400).json({ error: "Dates must be different" });
  }

  try {
    const oldEntries = await Entry.find({ date: oldDate });
    if (oldEntries.length === 0) {
      return res.status(404).json({ error: "No entries found on oldDate" });
    }

    let shifted = 0;
    let merged = 0;

    for (const oldEntry of oldEntries) {
      const conflict = await Entry.findOne({ laundryId: oldEntry.laundryId, date: newDate });
      if (!conflict) {
        oldEntry.date = newDate;
        await oldEntry.save();
        shifted++;
      } else {
        conflict.commonQty = Number(conflict.commonQty || 0) + Number(oldEntry.commonQty || 0);
        
        const mergedItems = conflict.items ? new Map(conflict.items) : new Map();
        if (oldEntry.items) {
          const oldItemsObj = oldEntry.items instanceof Map ? Object.fromEntries(oldEntry.items) : oldEntry.items;
          for (const [itemId, qty] of Object.entries(oldItemsObj)) {
            const currentQty = mergedItems.get(itemId) || 0;
            mergedItems.set(itemId, currentQty + Number(qty || 0));
          }
        }
        conflict.items = mergedItems;
        await conflict.save();

        await Entry.findByIdAndDelete(oldEntry._id);
        merged++;
      }
    }

    res.json({ ok: true, shiftedCount: shifted, mergedCount: merged });
  } catch (err) {
    console.error("Failed to shift date", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/entries", async (req, res) => {
  const { laundryId, month, startDate, endDate } = req.query;
  const query = {};
  if (laundryId) query.laundryId = laundryId;
  if (startDate && endDate) {
    query.date = { $gte: startDate, $lte: endDate };
  } else if (month) {
    query.date = new RegExp(`^${month}`);
  }
  const entries = await Entry.find(query);
  res.json(entries);
});

app.post("/api/entries", async (req, res) => {
  const { laundryId, date, commonQty, items } = req.body;
  if (!laundryId || !date)
    return res.status(400).json({ error: "Laundry and date required" });
  const exists = await Entry.findOne({ laundryId, date });
  if (exists) {
    return res
      .status(409)
      .json({ error: "Entry already exists for this customer and date" });
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
      return res
        .status(409)
        .json({ error: "Entry already exists for this customer and date" });
    }
    throw err;
  }
});

app.put("/api/entries/:id", async (req, res) => {
  const { laundryId, date, commonQty, items } = req.body;
  if (!laundryId || !date)
    return res.status(400).json({ error: "Laundry and date required" });

  try {
    // make sure we're not editing into a date/customer combo that already has a different entry
    const conflict = await Entry.findOne({
      laundryId,
      date,
      _id: { $ne: req.params.id },
    });
    if (conflict) {
      return res
        .status(409)
        .json({ error: "Entry already exists for this customer and date" });
    }

    const entry = await Entry.findByIdAndUpdate(
      req.params.id,
      {
        laundryId,
        date,
        commonQty: Number(commonQty || 0),
        items: items || {},
      },
      { new: true, runValidators: true },
    );

    if (!entry) return res.status(404).json({ error: "Entry not found" });
    res.json(entry);
  } catch (err) {
    if (err?.code === 11000) {
      return res
        .status(409)
        .json({ error: "Entry already exists for this customer and date" });
    }
    throw err;
  }
});

app.delete("/api/entries/:id", async (req, res) => {
  await Entry.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

app.get("/api/bill", async (req, res) => {
  const { laundryId, month, startDate, endDate } = req.query;
  if (!laundryId)
    return res.status(400).json({ error: "Laundry ID is required" });
  if (!month && (!startDate || !endDate)) {
    return res.status(400).json({ error: "Either month or date range (startDate & endDate) is required" });
  }

  const customer = await Customer.findById(laundryId);
  const common = await Common.findOne();
  const rates = await Rate.find();

  const query = { laundryId };
  if (startDate && endDate) {
    query.date = { $gte: startDate, $lte: endDate };
  } else {
    query.date = new RegExp(`^${month}`);
  }
  const entries = await Entry.find(query);

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
    if (
      name === "shriram" ||
      (name.includes("shri") && name.includes("ram")) ||
      name === "sachin"
    ) {
      activeCommonRate = 3;
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
    startDate,
    endDate,
    rows,
    totalAmount,
  });
});

const path = require("path");

// Serve static assets from the React production build
app.use(express.static(path.join(__dirname, "../frontend/dist")));

// Catch-all route to serve the React SPA index.html for non-API routes
app.get("*", (req, res) => {
  if (req.path.startsWith("/assets/")) {
    return res.status(404).send("Asset not found");
  }
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
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
