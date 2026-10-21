/**
 * Vercel serverless TTS proxy.
 * Keeps OPENAI_API_KEY on the server — never ship it to the browser.
 *
 * POST { text, ratePref? }
 * → audio/mpeg (OpenAI gpt-4o-mini-tts, Onyx)
 *
 * GET → { available: boolean } so the client can probe without speaking.
 *
 * Response formatting matches the earlier Play sample that browsers could
 * play (mp3, audio/mpeg). Only the voice id is Onyx.
 */

import OpenAI from 'openai';

const MAX_CHARS = 600;

/**
 * Same shape as the earlier sample instructions, written for Onyx.
 */
const DEFAULT_INSTRUCTIONS =
  'Speak naturally and clearly as a traditional masculine American man. ' +
  'Sound like a helpful person, not a robot. Enunciate numbers carefully.';

/** Fixed product voice: OpenAI Onyx. */
const DEFAULT_VOICE = 'onyx';
const TTS_MODEL = 'gpt-4o-mini-tts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Expose-Headers': 'X-MathLift-Voice',
};

const json = (body, status, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...extra,
    },
  });

async function handleRequest(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json({ available: false, error: 'OPENAI_API_KEY not configured' }, 503);
  }

  if (request.method === 'GET') {
    return json(
      {
        available: true,
        model: TTS_MODEL,
        defaultVoice: DEFAULT_VOICE,
        disclosure: 'AI-generated voice',
      },
      200
    );
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text) return json({ error: 'Missing text' }, 400);
    if (text.length > MAX_CHARS) {
      return json({ error: `Text too long (max ${MAX_CHARS} characters)` }, 400);
    }

    // Always Onyx — same request fields the earlier sample used.
    const voice = DEFAULT_VOICE;
    const ratePref = body.ratePref === 'slow' ? 'slow' : 'normal';
    const speed = ratePref === 'slow' ? 0.95 : 1.0;

    const client = new OpenAI({ apiKey });
    const speech = await client.audio.speech.create({
      model: TTS_MODEL,
      voice,
      input: text,
      instructions: DEFAULT_INSTRUCTIONS,
      speed,
      response_format: 'mp3',
    });

    const buffer = Buffer.from(await speech.arrayBuffer());
    return new Response(buffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'private, max-age=3600',
        'X-MathLift-TTS': 'openai-gpt-4o-mini-tts',
        'X-MathLift-Voice': voice,
      },
    });
  } catch (error) {
    console.error('tts proxy failed', error?.message || error);
    return json({ available: false, error: 'Speech generation failed' }, 502);
  }
}

/** Current Vercel Node runtime. */
export function GET(request) {
  return handleRequest(request);
}

export function POST(request) {
  return handleRequest(request);
}

export function OPTIONS(request) {
  return handleRequest(request);
}

export default {
  fetch(request) {
    return handleRequest(request);
  },
};
