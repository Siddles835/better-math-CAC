/**
 * Vercel serverless TTS proxy.
 * Keeps OPENAI_API_KEY on the server — never ship it to the browser.
 *
 * POST { text, ratePref? } → audio/mpeg (gpt-4o-mini-tts, Onyx)
 * GET → { available: boolean }
 *
 * This file is ESM because package.json has "type": "module".
 * CommonJS `require` crashes the function (FUNCTION_INVOCATION_FAILED)
 * and the lesson then speaks with the device voice.
 */

import OpenAI from 'openai';

const MAX_CHARS = 600;
const DEFAULT_VOICE = 'onyx';
const TTS_MODEL = 'gpt-4o-mini-tts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Expose-Headers': 'X-MathLift-Voice',
};

const json = (body, status) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

async function handle(request) {
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

    const voice = DEFAULT_VOICE;
    const ratePref = body.ratePref === 'slow' ? 'slow' : 'normal';
    const speed = ratePref === 'slow' ? 0.95 : 1;

    const client = new OpenAI({ apiKey });
    // No instructions. A teacher script makes Onyx sound like the previous voice.
    const speech = await client.audio.speech.create({
      model: TTS_MODEL,
      voice,
      input: text,
      speed,
      response_format: 'mp3',
    });

    const buffer = Buffer.from(await speech.arrayBuffer());
    return new Response(buffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
        'X-MathLift-TTS': 'openai-gpt-4o-mini-tts',
        'X-MathLift-Voice': voice,
      },
    });
  } catch (error) {
    console.error('tts proxy failed', error?.message || error);
    return json({ available: false, error: 'Speech generation failed' }, 502);
  }
}

export function GET(request) {
  return handle(request);
}

export function POST(request) {
  return handle(request);
}

export function OPTIONS(request) {
  return handle(request);
}

export default {
  fetch(request) {
    return handle(request);
  },
};
