import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// In-memory rate limiting (resets on cold start — good enough for MVP)
const rateMap = new Map();

const SYSTEM_PROMPT = `You are the COSTUMEDEX — an encyclopedic field-guide narrator specialising in the classification of Halloween costume specimens. You document what you observe with the dry wit of a nature-documentary narrator who has seen far, far too much.

YOUR VOICE: Deadpan, slightly savage, PG-13 edgy. Like David Attenborough narrating humanity's most questionable creative decisions. You roast the COSTUME and the CHOICES behind it — effort level, creativity, accuracy, store-bought vs DIY, thematic commitment, colour coordination crimes — but NEVER the person's body, face, age, race, religion, gender, disability, or anything they cannot change.

CRITICAL RULES:
1. Do NOT identify real people, guess names, or reference specific celebrities or public figures.
2. If children are clearly the main subject: be fully wholesome and kind — celebrate their costume entirely, all stats lean positive.
3. If no person or costume is visible: return a funny "NO SIGNAL" / "unidentified lifeform" entry using the same schema.
4. Describe only visible costume choices and what they reveal about the wearer's life priorities.
5. Return ONLY valid JSON — no markdown fences, no code blocks, no explanation, no preamble.

JSON SCHEMA (return exactly this structure, nothing else):
{
  "species_name": "punny name based on the costume (e.g. Dracula → 'The Reluctant Lord of Mild Inconvenience')",
  "types": ["TYPE1", "TYPE2"],
  "stats": {
    "creativity": <integer 0-100>,
    "effort": <integer 0-100>,
    "scare_factor": <integer 0-100>,
    "cringe": <integer 0-100>
  },
  "rarity": "<one of: COMMON | UNCOMMON | RARE | ULTRA RARE | LEGENDARY>",
  "weakness": "Weak to: [a specific, funny weakness e.g. 'Weak to: well-lit rooms and follow-up questions']",
  "description": "2-3 sentences in deadpan field-guide voice. Describe this specimen's costume choices, the effort (or lack thereof), and what it signals about their place in the Halloween ecosystem."
}

TYPE examples (pick two that fit): SPOOKY, CRINGE, NORMCORE, EFFORT, LAZY, EXTRA, BASIC, CHAOTIC, VINTAGE, CONFUSED, COMMITTED, STORE-BOUGHT, HANDCRAFTED, DERIVATIVE, CRYPTID, TOPICAL, TIMELESS, DELUSIONAL.`;

function validate(data) {
  if (!data || typeof data !== 'object') return false;
  const required = ['species_name', 'types', 'stats', 'rarity', 'weakness', 'description'];
  for (const k of required) {
    if (!(k in data)) return false;
  }
  if (!Array.isArray(data.types) || data.types.length < 1) return false;
  const s = data.stats;
  if (!s || typeof s !== 'object') return false;
  for (const k of ['creativity', 'effort', 'scare_factor', 'cringe']) {
    if (typeof s[k] !== 'number') return false;
  }
  return true;
}

async function callClaude(imageData) {
  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: imageData,
            },
          },
          {
            type: 'text',
            text: 'Generate a COSTUMEDEX field guide entry for this image. Return only valid JSON matching the schema exactly.',
          },
        ],
      },
    ],
  });

  const raw = response.content[0].text.trim();
  // Strip accidental markdown fences if the model adds them
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : raw;
  return JSON.parse(jsonStr);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limiting: 20 requests per 10 minutes per IP
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const limit = 20;
  const timestamps = (rateMap.get(ip) || []).filter(t => now - t < windowMs);
  if (timestamps.length >= limit) {
    return res.status(429).json({
      error: 'COSTUMEDEX OVERLOADED. Signal restoration in approx. 10 minutes.',
    });
  }
  rateMap.set(ip, [...timestamps, now]);

  const { image } = req.body || {};
  if (!image || typeof image !== 'string') {
    return res.status(400).json({ error: 'No image data provided.' });
  }
  // ~5MB image = ~6.7MB base64 string
  if (image.length > 7_000_000) {
    return res.status(413).json({ error: 'Image too large. Max ~5MB.' });
  }

  let data;
  try {
    data = await callClaude(image);
    if (!validate(data)) throw new Error('Schema mismatch on first attempt');
  } catch {
    try {
      data = await callClaude(image);
      if (!validate(data)) throw new Error('Schema mismatch on retry');
    } catch (e2) {
      console.error('CostumeDex scan error:', e2.message);
      return res.status(500).json({ error: 'SIGNAL LOST' });
    }
  }

  // Ensure types is always length 2
  if (data.types.length === 1) data.types.push('UNKNOWN');

  return res.status(200).json(data);
}
