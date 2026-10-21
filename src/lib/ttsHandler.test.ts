import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
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

const loadHandler = () => {
  const filename = path.resolve('api/tts.js');
  const source = readFileSync(filename, 'utf8');
  const module = { exports: {} as (req: unknown, res: unknown) => Promise<void> };
  const localRequire = createRequire(filename);
  const sandboxRequire = (id: string) => {
    if (id === 'openai') {
      class OpenAI {
        audio = { speech: { create: speechCreate } };
        constructor(_opts: { apiKey?: string }) {}
      }
      return OpenAI;
    }
    return localRequire(id);
  };
  runInNewContext(source, {
    module,
    exports: module.exports,
    require: sandboxRequire,
    process,
    Buffer,
    console,
  }, { filename });
  return module.exports;
};

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
    vi.restoreAllMocks();
  });

  it('answers GET when the key is missing', async () => {
    delete process.env.OPENAI_API_KEY;
    const handler = loadHandler();
    const res = mockRes();
    await handler({ method: 'GET' }, res);
    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({ available: false });
  });

  it('reports Onyx available on GET when the key is set', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    const handler = loadHandler();
    const res = mockRes();
    await handler({ method: 'GET' }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      available: true,
      defaultVoice: 'onyx',
    });
  });

  it('posts Onyx as an mp3 in the earlier sample format', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    speechCreate.mockClear();
    const handler = loadHandler();
    const res = mockRes();
    await handler(
      {
        method: 'POST',
        body: {
          text: 'The quick brown fox jumps over the lazy dog.',
          voice: 'ash',
          ratePref: 'normal',
        },
      },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('audio/mpeg');
    expect(res.headers['X-MathLift-Voice']).toBe('onyx');
    expect(Buffer.isBuffer(res.body)).toBe(true);

    const sent = speechCreate.mock.calls[0]?.[0];
    expect(sent?.voice).toBe('onyx');
    expect(sent?.response_format).toBe('mp3');
    expect(sent?.input).toBe('The quick brown fox jumps over the lazy dog.');
    expect(sent?.speed).toBe(1);
  });
});
