import { afterEach, describe, expect, it, vi } from 'vitest';

const speechCreate = vi.fn(
  async (_body: {
    voice?: string;
    instructions?: string;
    input?: string;
    response_format?: string;
    speed?: number;
  }) => ({
    arrayBuffer: async () => Uint8Array.from([73, 68, 51, 3, 0, 0, 0, 0]).buffer,
  })
);

vi.mock('openai', () => {
  class OpenAI {
    audio = { speech: { create: speechCreate } };
    constructor(_opts: { apiKey?: string }) {}
  }
  return { default: OpenAI };
});

import tts, { GET, POST } from '../../api/tts.js';

describe('api/tts handler', () => {
  const previousKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
    vi.restoreAllMocks();
  });

  it('answers GET when the key is missing', async () => {
    delete process.env.OPENAI_API_KEY;
    const response = await GET(new Request('http://localhost/api/tts'));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ available: false });
  });

  it('reports Onyx available on GET when the key is set', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    const response = await tts.fetch(new Request('http://localhost/api/tts'));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      available: true,
      defaultVoice: 'onyx',
    });
  });

  it('posts raw Onyx mp3 with no teacher script', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    speechCreate.mockClear();
    const response = await POST(
      new Request('http://localhost/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'one',
          voice: 'ash',
          ratePref: 'normal',
        }),
      })
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('audio/mpeg');
    expect(response.headers.get('X-MathLift-Voice')).toBe('onyx');
    const sent = speechCreate.mock.calls[0]?.[0];
    expect(sent?.voice).toBe('onyx');
    expect(sent?.response_format).toBe('mp3');
    expect(sent?.input).toBe('one');
    expect(sent?.instructions).toBeUndefined();
  });
});
