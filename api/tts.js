/**
 * Vercel serverless TTS proxy.
 * Keeps OPENAI_API_KEY on the server — never ship it to the browser.
 *
 * POST { text, voice?, lang?, ratePref?, instructions? }
 * → audio/mpeg
 *
 * GET → { available: boolean } so the client can probe without speaking.
 */
import OpenAI from 'openai';

const MAX_CHARS = 600;
const ALLOWED_VOICES = new Set([
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'fable',
  'nova',
  'onyx',
  'sage',
  'shimmer',
  'verse',
  'marin',
  'cedar',
]);

/** Warm, clear teacher tone for early elementary listeners. */
const DEFAULT_INSTRUCTIONS =
  'Speak clearly and warmly, like a friendly elementary school teacher. ' +
  'Keep a calm, encouraging tone. Enunciate numbers carefully. ' +
  'Do not sound rushed or robotic.';

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

export default async function handler(req, res) {
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
      model: 'gpt-4o-mini-tts',
      defaultVoice: 'coral',
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

    const voice =
      typeof body.voice === 'string' && ALLOWED_VOICES.has(body.voice) ? body.voice : 'coral';
    const ratePref = body.ratePref === 'slow' ? 'slow' : 'normal';
    // OpenAI speed: 0.25–4.0. Keep kid-friendly pacing near 1.0.
    const speed = ratePref === 'slow' ? 0.9 : 1.0;
    const instructions =
      typeof body.instructions === 'string' && body.instructions.trim()
        ? body.instructions.trim().slice(0, 400)
        : DEFAULT_INSTRUCTIONS;

    const client = new OpenAI({ apiKey });
    const response = await client.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice,
      input: text,
      instructions,
      speed,
      response_format: 'mp3',
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('X-MathLift-TTS', 'openai-gpt-4o-mini-tts');
    res.setHeader('X-MathLift-Voice', voice);
    res.status(200).send(buffer);
  } catch (error) {
    console.error('tts proxy failed', error?.message || error);
    res.status(502).json({
      available: false,
      error: 'Speech generation failed',
    });
  }
}
