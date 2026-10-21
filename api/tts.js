/**
 * Vercel serverless TTS proxy.
 * Keeps OPENAI_API_KEY on the server — never ship it to the browser.
 *
 * POST { text, ratePref? }
 * → audio/wav (OpenAI gpt-4o-mini-tts, Onyx — traditional masculine)
 *
 * GET → { available: boolean } so the client can probe without speaking.
 *
 * Uses CommonJS so Vercel always registers this as a Node serverless
 * function even when the app package.json has "type": "module".
 */

const OpenAI = require('openai');

const MAX_CHARS = 600;

/**
 * Onyx's preset is a deep male. Keep the prompt short so gpt-4o-mini-tts
 * does not replace that timbre with the same generic teacher performance
 * used for Ash.
 */
const DEFAULT_INSTRUCTIONS =
  'Low baritone only. Middle-aged American man, deep chest voice, pitched down. ' +
  'Slow and plain. Do not sound young, bright, medium-pitched, or like the previous lighter voice.';

/** Fixed product voice: OpenAI Onyx (traditional masculine). Never Ash / Alloy. */
const DEFAULT_VOICE = 'onyx';
const TTS_MODEL = 'gpt-4o-mini-tts';

const cors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

const readJson = async (req) => {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw);
};

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ available: false, error: 'OPENAI_API_KEY not configured' });
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({
      available: true,
      model: TTS_MODEL,
      defaultVoice: DEFAULT_VOICE,
      gender: 'male',
      accent: 'general-american',
      disclosure: 'AI-generated voice',
    });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = await readJson(req);
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text) {
      res.status(400).json({ error: 'Missing text' });
      return;
    }
    if (text.length > MAX_CHARS) {
      res.status(400).json({ error: `Text too long (max ${MAX_CHARS} characters)` });
      return;
    }

    // Ignore client voice — always Onyx (traditional masculine). Ash cannot drift in.
    const voice = DEFAULT_VOICE;
    const ratePref = body.ratePref === 'slow' ? 'slow' : 'normal';
    const speed = ratePref === 'slow' ? 0.78 : 0.88;

    const client = new OpenAI({ apiKey });
    const response = await client.audio.speech.create({
      model: TTS_MODEL,
      voice,
      input: text,
      instructions: DEFAULT_INSTRUCTIONS,
      speed,
      response_format: 'wav',
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Access-Control-Expose-Headers', 'X-MathLift-Voice, X-MathLift-Gender');
    res.setHeader('X-MathLift-TTS', TTS_MODEL);
    res.setHeader('X-MathLift-Voice', voice);
    res.setHeader('X-MathLift-Gender', 'male');
    res.setHeader('X-MathLift-Accent', 'general-american');
    res.status(200).send(buffer);
  } catch (error) {
    console.error('tts proxy failed', error?.message || error);
    res.status(502).json({
      available: false,
      error: 'Speech generation failed',
    });
  }
};
