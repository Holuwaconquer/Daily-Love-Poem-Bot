const fs = require('fs');
const path = require('path');
const express = require('express');
const cron = require('node-cron');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const { CohereClient } = require('cohere-ai');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

// Check required environment variables
if (!process.env.COHERE_API_KEY || !process.env.TWILIO_SID || !process.env.EMAIL_USER) {
  throw new Error("❌ Missing required environment variables in .env");
}

// Twilio config (for WhatsApp)
const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
const TO_PHONE = process.env.TO_PHONE;        // e.g., 'whatsapp:+1234567890'
const FROM_PHONE = process.env.FROM_PHONE;    // 'whatsapp:+14155238886' (Twilio Sandbox)

// Cohere setup
const cohere = new CohereClient({ token: process.env.COHERE_API_KEY });

// Generate a romantic poem
async function generateLovePoem() {
  const prompt = "Write a short, sweet, romantic love poem for my crush.";

  const response = await cohere.generate({
    model: 'command-r-plus',
    prompt,
    maxTokens: 100,
    temperature: 0.8
  });

  return response.generations[0].text.trim();
}

// Send via WhatsApp
async function sendWhatsAppPoem(poem) {
  await twilioClient.messages.create({
    body: `💌 Here's your love poem for today:\n\n${poem}\n\nFrom: Peter Okikiola Fakorede!`,
    from: FROM_PHONE,
    to: TO_PHONE
  });
}

// Send via Email
async function sendEmail(poem) {
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: `"Love Poem Bot" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_TO,
    subject: '🌹 Your Daily Love Poem',
    text: poem
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("📧 Poem sent via email.");
  } catch (error) {
    console.error("❌ Failed to send email:", error.message);
  }
}

// Save poem to poems.log
function logPoem(poem) {
  const timestamp = new Date().toISOString();
  const logEntry = `\n[${timestamp}]\n${poem}\n${'-'.repeat(40)}\n`;

  fs.appendFile(path.join(__dirname, 'poems.log'), logEntry, (err) => {
    if (err) {
      console.error("❌ Failed to log poem:", err.message);
    } else {
      console.log("📝 Poem logged to poems.log");
    }
  });
}

// Route for manual trigger (if needed)
app.get('/send-poem', async (req, res) => {
  try {
    const poem = await generateLovePoem();

    await sendWhatsAppPoem(poem);
    await sendEmail(poem);
    logPoem(poem);

    res.status(200).json({ success: true, poem });
  } catch (error) {
    console.error("❌ Full error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cron job - every day at 7AM
cron.schedule('0 7 * * *', async () => {
  console.log("⏰ Running scheduled poem delivery...");

  try {
    const poem = await generateLovePoem();
    await sendWhatsAppPoem(poem);
    await sendEmail(poem);
    logPoem(poem);

    console.log("✅ Poem sent by scheduler:", poem);
  } catch (error) {
    console.error("❌ Scheduler failed:", error.message);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
