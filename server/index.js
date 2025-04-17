const express = require("express");
const cors = require("cors");
const multer = require("multer");
const csvParse = require("csv-parse");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { Configuration, OpenAIApi } = require("openai");
const axios = require("axios");

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

// --- Utils ---
function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const records = [];
    fs.createReadStream(filePath)
      .pipe(csvParse({ columns: true, skip_empty_lines: true }))
      .on("data", (row) => records.push(row))
      .on("end", () => resolve(records))
      .on("error", reject);
  });
}

// --- Endpoints ---
// 1. Receive user input via CSV, analyze, and recommend
app.post("/api/upload-csv", upload.single("file"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const userData = await parseCSV(filePath);
    fs.unlinkSync(filePath);

    // 2. Analyze user data & get recommendation via OpenAI
    const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY }));
    const prompt = `Given this user data: ${JSON.stringify(userData)}, analyze nutrition and taste preferences, and recommend a recipe (with ingredients, calories, macros, taste profile, cuisine, etc.).`;
    const aiResponse = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a food and nutrition expert." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    });
    const recommendation = aiResponse.data.choices[0].message.content;

    res.json({ userData, recommendation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to process CSV and generate recommendation." });
  }
});

// 2. Order ingredients (mock)
app.post("/api/order-ingredients", async (req, res) => {
  try {
    // Here you could integrate with a real grocery API
    res.json({ status: "Order placed successfully!" });
  } catch {
    res.status(500).json({ status: "Order failed." });
  }
});

// --- Start Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
