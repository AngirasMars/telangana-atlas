// C:\Users\angir\telangana-atlas\backend\server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 5000;

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const firestore = admin.firestore();

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  const msg = message.toLowerCase();

  // Basic manual match: floods in nacharam
  if (msg.includes("floods") && msg.includes("nacharam")) {
    const postsSnapshot = await firestore.collectionGroup("posts").get();

    const pins = [];
    postsSnapshot.forEach(doc => {
      const post = doc.data();
      console.log("🔥 Raw Post:", post); // print whole post

      const content = post.text || post.content || "";  // fallback
      const tags = post.hashtags?.join(" ") || "";
      const combined = `${content} ${tags}`.toLowerCase();

      console.log("Post Text:", combined);

      if (combined.includes("nacharam") && combined.includes("floods")) {
        console.log("✅ Match found for post:", doc.id);
        pins.push({
          lat: post.lat,
          lng: post.lng,
          postId: doc.id,
        });
      }
    });

    console.log("Total pins found:", pins.length); // 🐞 Debug: Count matches

    if (pins.length > 0) {
      return res.json({
        message: `Found ${pins.length} real pins for floods in Nacharam. Flying you there now.`,
        pins,
      });
    } else {
      return res.json({
        message: `Couldn't find any real pins for floods in Nacharam.`,
        pins: [],
      });
    }
  }

  return res.json({
    message: `No known pattern matched. Try: 'floods in Nacharam'.`,
    pins: []
  });
});

// NEW ENDPOINT: Get matching pins with postId
app.post('/api/get-matching-pins', async (req, res) => {
  const { location, incident } = req.body;

  if (!location || !incident) {
    return res.status(400).json({ error: "Location and incident are required." });
  }

  try {
    const postsSnapshot = await firestore.collection("posts").get();
    const matchingPins = [];

    postsSnapshot.forEach(doc => {
      const post = doc.data();
      const text = `${post.content} ${post.hashtags?.join(" ") || ""}`.toLowerCase();

      if (text.includes(location.toLowerCase()) && text.includes(incident.toLowerCase())) {
        matchingPins.push({
          lat: post.lat,
          lng: post.lng,
          content: post.content,
          postId: doc.id  // Critical: Add post ID
        });
      }
    });

    res.json({ pins: matchingPins });
  } catch (error) {
    console.error("Error in get-matching-pins:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

const districtsEnrichedData = require('../frontend/src/data/districts_enriched.json');

app.get('/api/districts', (req, res) => {
  res.json(districtsEnrichedData);
});

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});