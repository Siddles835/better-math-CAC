/**
 * Dev-only /api/tts middleware so `npm run dev` can use OPENAI_API_KEY
 * the same way Vercel serverless does in production.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

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

const DEFAULT_INSTRUCTIONS =
  'Speak clearly and warmly, like a friendly elementary school teacher. ' +
  'Keep a calm, encouraging tone. Enunciate numbers carefully. ' +
  'Do not sound rushed or robotic.';

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
              model: 'gpt-4o-mini-tts',
              defaultVoice: 'alloy',
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
          // MathLift always uses Alloy for classroom read-aloud.
          const voice = 'alloy';
          const ratePref = body.ratePref === 'slow' ? 'slow' : 'normal';
          const speed = ratePref === 'slow' ? 0.9 : 1.0;

          const { default: OpenAI } = await import('openai');
          const client = new OpenAI({ apiKey });
          const speech = await client.audio.speech.create({
            model: 'gpt-4o-mini-tts',
            voice,
            input: text,
            instructions: DEFAULT_INSTRUCTIONS,
            speed,
            response_format: 'mp3',
          });
          const buffer = Buffer.from(await speech.arrayBuffer());
          response.statusCode = 200;
          response.setHeader('Content-Type', 'audio/mpeg');
          response.setHeader('Cache-Control', 'private, max-age=3600');
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
