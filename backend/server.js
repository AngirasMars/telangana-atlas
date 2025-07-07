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
  const { message, districtName, context } = req.body;

  if (!message || !districtName) {
    return res.status(400).json({ error: "Message and district name are required." });
  }

  try {
    const extractionPrompt = `
You are a helpful assistant. Extract the location and incident type from this user query:
"${message}"
Respond ONLY with a JSON object like:
{ "location": "<place>", "incident": "<type>" }

If you can't extract both, use null values.
    `;

    const extractionResult = await model.generateContent(extractionPrompt);
    const extractionText = await extractionResult.response.text();

    const match = extractionText.match(/\{[^}]+\}/);
    let location = null, incident = null;

    if (match) {
      const parsed = JSON.parse(match[0]);
      location = parsed.location;
      incident = parsed.incident;
    }

    let pins = [];

    if (location && incident) {
      const postsSnapshot = await firestore.collection("posts").get();

      postsSnapshot.forEach(doc => {
        const post = doc.data();
        const text = `${post.content} ${post.hashtags?.join(" ") || ""}`.toLowerCase();

        if (text.includes(location.toLowerCase()) && text.includes(incident.toLowerCase())) {
          pins.push({
            lat: post.lat,
            lng: post.lng,
            content: post.content,
          });
        }
      });
    }

    let replyPrompt;
    if (context && context.length > 0) {
      replyPrompt = `You are a Telangana-aware assistant helping a user. Based on this chat history:\n${context}\nTheir next message: "${message}"\nGive a helpful, conversational answer.`;
    } else {
      replyPrompt = `You are a Telangana-aware assistant. User message: "${message}"\nGive a short, friendly reply about the topic.`;
    }

    const finalResult = await model.generateContent(replyPrompt);
    const replyText = await finalResult.response.text();

    const pinSummary = (pins && pins.length > 0)
      ? `Here are ${pins.length} pins that mention '${location}' and '${incident}'.`
      : "";

    res.json({
      reply: pinSummary + "\n\n" + replyText,
      pins,
    });

  } catch (error) {
    console.error("Error in Gemini chat API:", error);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
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