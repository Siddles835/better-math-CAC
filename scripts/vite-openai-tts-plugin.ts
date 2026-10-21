/**
 * Dev-only /api/tts middleware so `npm run dev` can use OPENAI_API_KEY
 * the same way Vercel serverless does in production.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

const MAX_CHARS = 600;

const DEFAULT_INSTRUCTIONS =
  'Speak as an adult American man from the Midwest. ' +
  'Deep male voice only — never sound like a woman or a girl. ' +
  'Pure General American English accent (rhotic R, American vowels, “zee” for Z). ' +
  'Do not sound Chinese, East Asian, British, Australian, or Irish. ' +
  'Calm classroom pace. Crisp consonants. Enunciate every number.';

const DEFAULT_VOICE = 'ash';
const TTS_MODEL = 'gpt-4o-mini-tts';

const readBody = (req: IncomingMessage): Promise<Record<string, unknown>> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? (JSON.parse(raw) as Record<string, unknown>) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });

export function openaiTtsDevPlugin(): Plugin {
  return {
    name: 'openai-tts-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0];
        if (url !== '/api/tts') {
          next();
          return;
        }

        const apiKey = process.env.OPENAI_API_KEY;
        const response = res as ServerResponse;
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          response.statusCode = 204;
          response.end();
          return;
        }

        if (!apiKey) {
          response.statusCode = 503;
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify({ available: false, error: 'OPENAI_API_KEY not configured' }));
          return;
        }

        if (req.method === 'GET') {
          response.statusCode = 200;
          response.setHeader('Content-Type', 'application/json');
          response.end(
            JSON.stringify({
              available: true,
              model: TTS_MODEL,
              defaultVoice: DEFAULT_VOICE,
              gender: 'male',
              accent: 'general-american',
              disclosure: 'AI-generated voice',
            })
          );
          return;
        }

        if (req.method !== 'POST') {
          response.statusCode = 405;
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          const body = await readBody(req);
          const text = typeof body.text === 'string' ? body.text.trim() : '';
          if (!text || text.length > MAX_CHARS) {
            response.statusCode = 400;
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify({ error: 'Invalid text' }));
            return;
          }
          const voice = DEFAULT_VOICE;
          const ratePref = body.ratePref === 'slow' ? 'slow' : 'normal';
          const speed = ratePref === 'slow' ? 0.78 : 0.88;

          const { default: OpenAI } = await import('openai');
          const client = new OpenAI({ apiKey });
          const speech = await client.audio.speech.create({
            model: TTS_MODEL,
            voice,
            input: text,
            instructions: DEFAULT_INSTRUCTIONS,
            speed,
            response_format: 'wav',
          });
          const buffer = Buffer.from(await speech.arrayBuffer());
          response.statusCode = 200;
          response.setHeader('Content-Type', 'audio/wav');
          response.setHeader('Cache-Control', 'private, max-age=3600');
          response.setHeader('X-MathLift-Voice', voice);
          response.setHeader('X-MathLift-Gender', 'male');
          response.setHeader('X-MathLift-Accent', 'general-american');
          response.end(buffer);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error('dev /api/tts failed', message);
          response.statusCode = 502;
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify({ available: false, error: 'Speech generation failed' }));
        }
      });
    },
  };
}
