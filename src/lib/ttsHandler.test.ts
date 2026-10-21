import { afterEach, describe, expect, it, vi } from 'vitest';

const speechCreate = vi.fn(
  async (_body: { voice?: string; instructions?: string; input?: string }) => ({
    arrayBuffer: async () => Uint8Array.from([82, 73, 70, 70, 0, 0, 0, 0]).buffer,
  })
);

vi.mock('openai', () => {
  class OpenAI {
    audio = { speech: { create: speechCreate } };
  }
  return { default: OpenAI };
});

import handler from '../../api/tts.js';

type MockRes = {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
  setHeader: (key: string, value: string) => void;
  status: (code: number) => MockRes;
  json: (payload: unknown) => MockRes;
  send: (payload: unknown) => MockRes;
  end: () => MockRes;
};

const mockRes = (): MockRes => {
  const res: MockRes = {
    statusCode: 0,
    headers: {},
    body: undefined,
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
    end() {
      return this;
    },
  };
  return res;
};

describe('api/tts handler', () => {
  const previousKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('loads as an ES module and answers GET when the key is missing', async () => {
    delete process.env.OPENAI_API_KEY;
    const res = mockRes();
    await handler({ method: 'GET' }, res);
    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({ available: false });
  });

  it('reports Onyx available on GET when the key is set', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    const res = mockRes();
    await handler({ method: 'GET' }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      available: true,
      defaultVoice: 'onyx',
      gender: 'male',
    });
  });

  it('posts Onyx with the baritone instruction and returns wav', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    speechCreate.mockClear();

    const res = mockRes();
    await handler(
      {
        method: 'POST',
        body: { text: 'The quick brown fox jumps over the lazy dog.', voice: 'ash', ratePref: 'normal' },
      },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('audio/wav');
    expect(res.headers['X-MathLift-Voice']).toBe('onyx');
    expect(Buffer.isBuffer(res.body)).toBe(true);

    const sent = speechCreate.mock.calls[0]?.[0];
    expect(sent.voice).toBe('onyx');
    expect(sent.input).toBe('The quick brown fox jumps over the lazy dog.');
    expect(sent.instructions).toMatch(/baritone/i);
  });
});
