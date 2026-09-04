import "dotenv/config";
import express from "express";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = process.env.OPENAI_MODEL || "gpt-5.6-luna";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY is not set. Add it to .env before sending messages.");
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(express.json({ limit: "12mb" }));
app.use(express.static(path.join(__dirname, "public")));

const instructions = `
You are AyushLohani's AI Agent, a versatile all-in-one assistant.
Personality: adapt naturally to the user's tone. You can be friendly, professional,
funny, playful, serious, or concise when appropriate, without becoming rude or offensive.
Language: reply in the language/style the user uses, including Nepali, Roman Nepali,
English, Hindi, or mixed language.
Capabilities: general chat, coding, study help, research-style explanations, writing,
translation, problem solving, gaming help, and image understanding when an image is provided.
Be honest about uncertainty. Do not claim to have browsed the web unless a web tool is actually enabled.
For code, prefer clear, copyable solutions with useful explanations.
`;

app.post("/api/chat", async (req, res) => {
  try {
    const { messages, image } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "No message supplied." });
    }

    const recent = messages.slice(-20).map(m => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || "").slice(0, 12000)
    }));

    if (image) {
      const lastUserIndex = recent.map(m => m.role).lastIndexOf("user");
      if (lastUserIndex >= 0) {
        const text = recent[lastUserIndex].content || "Please analyze this image.";
        recent[lastUserIndex] = {
          role: "user",
          content: [
            { type: "input_text", text },
            { type: "input_image", image_url: image }
          ]
        };
      }
    }

    const response = await client.responses.create({
      model: MODEL,
      instructions,
      input: recent,
      store: false
    });

    res.json({ text: response.output_text || "I couldn't generate a response." });
  } catch (error) {
    console.error(error);
    const message = error?.status === 401
      ? "API key invalid or missing. Check your .env file."
      : (error?.message || "Something went wrong.");
    res.status(500).json({ error: message });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`AyushLohani's AI Agent running at http://localhost:${PORT}`);
});
