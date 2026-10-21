import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_CLOUD_VOICE,
  ensureCloudTtsAvailable,
  getCloudTtsStatus,
  resetCloudTtsForTests,
  speakWithOpenAI,
} from './speechOpenAI';

describe('speechOpenAI', () => {
  beforeEach(() => {
    resetCloudTtsForTests();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    resetCloudTtsForTests();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('probes availability and reports when the API is ready', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ available: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const ok = await ensureCloudTtsAvailable();
    expect(ok).toBe(true);
    expect(getCloudTtsStatus()).toBe('available');
    expect(fetchMock).toHaveBeenCalledWith('/api/tts', { method: 'GET' });
  });

  it('keeps playing Onyx sample when a late stop from another call is stale', async () => {
    const { playAlloyReferenceSample, stopAlloyReferenceSample } = await import('./speechOpenAI');
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/wav' });
    const fetchMock = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      if (!init || init.method === 'GET') {
        return {
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ available: true }),
        };
      }
      return {
        ok: true,
        headers: { get: () => 'audio/wav' },
        blob: async () => blob,
      };
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:onyx-sample',
      revokeObjectURL: vi.fn(),
    });
    const audioInstances: Array<{
      pause: ReturnType<typeof vi.fn>;
      play: ReturnType<typeof vi.fn>;
      onended: (() => void) | null;
      onerror: (() => void) | null;
      volume: number;
    }> = [];
    class FakeAudio {
      volume = 0.5;
      preload = '';
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      pause = vi.fn();
      play = vi.fn().mockResolvedValue(undefined);
      constructor(_src?: string) {
        audioInstances.push(this);
      }
    }
    vi.stubGlobal('Audio', FakeAudio);

    stopAlloyReferenceSample();
    const pending = playAlloyReferenceSample();
    await vi.waitFor(() => expect(audioInstances.length).toBe(1));
    const first = audioInstances[0];
    expect(first?.play).toHaveBeenCalled();
    first?.onended?.();
    await expect(pending).resolves.toBe(true);
  });

  it('treats SPA HTML fallback as unavailable (not a working TTS API)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'text/html; charset=utf-8' },
      json: async () => {
        throw new Error('not json');
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    const ok = await ensureCloudTtsAvailable();
    expect(ok).toBe(false);
    expect(getCloudTtsStatus()).toBe('unavailable');
  });

  it('can re-probe after retry cooldown when previously unavailable', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'text/html' },
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ available: true }),
      });
    vi.stubGlobal('fetch', fetchMock);

    expect(await ensureCloudTtsAvailable()).toBe(false);
    expect(await ensureCloudTtsAvailable({ retry: true })).toBe(false);
    vi.setSystemTime(new Date('2026-01-01T00:00:16Z'));
    expect(await ensureCloudTtsAvailable({ retry: true })).toBe(true);
    expect(getCloudTtsStatus()).toBe('available');
    vi.useRealTimers();
  });

  it('always sends OpenAI onyx in the POST body', async () => {
    const { setPreferredCloudVoice, DEFAULT_CLOUD_VOICE } = await import('./speechOpenAI');
    setPreferredCloudVoice('sage');
    expect(DEFAULT_CLOUD_VOICE).toBe('onyx');

    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/wav' });
    const fetchMock = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      if (!init || init.method === 'GET') {
        return {
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ available: true }),
        };
      }
      return {
        ok: true,
        headers: { get: () => 'audio/wav' },
        blob: async () => blob,
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    const play = vi.fn().mockResolvedValue(undefined);
    const audioInstances: Array<{ onended: (() => void) | null; volume: number }> = [];
    class FakeAudio {
      volume = 0.5;
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      play = play;
      constructor(_src?: string) {
        audioInstances.push(this);
      }
    }
    vi.stubGlobal('Audio', FakeAudio);
    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:onyx',
      revokeObjectURL: vi.fn(),
    });

    const pending = speakWithOpenAI('Try onyx.', {
      token: 1,
      isCurrent: () => true,
      ratePref: 'normal',
      voice: 'coral',
    });
    await vi.waitFor(() => expect(audioInstances.length).toBe(1));
    audioInstances[0]?.onended?.();
    await pending;

    const postCall = fetchMock.mock.calls.find((call) => call[1]?.method === 'POST');
    expect(postCall).toBeTruthy();
    const body = JSON.parse(String(postCall?.[1]?.body ?? '{}')) as { voice?: string };
    expect(body.voice).toBe('onyx');
  });

  it('plays wav audio from the proxy when current', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/wav' });
    const fetchMock = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      if (!init || init.method === 'GET') {
        return {
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ available: true }),
        };
      }
      return {
        ok: true,
        headers: { get: () => 'audio/wav' },
        blob: async () => blob,
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    const play = vi.fn().mockResolvedValue(undefined);
    const audioInstances: Array<{ onended: (() => void) | null; volume: number }> = [];
    class FakeAudio {
      volume = 0.5;
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      play = play;
      constructor(_src?: string) {
        audioInstances.push(this);
      }
    }
    vi.stubGlobal('Audio', FakeAudio);
    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:test',
      revokeObjectURL: vi.fn(),
    });

    const onEnd = vi.fn();
    const pending = speakWithOpenAI('Hello students.', {
      token: 1,
      isCurrent: () => true,
      ratePref: 'normal',
      voice: 'coral',
      onEnd,
    });
    // Let the async fetch + Audio construction settle, then finish playback.
    await vi.waitFor(() => expect(audioInstances.length).toBe(1));
    audioInstances[0]?.onended?.();
    const played = await pending;

    expect(played).toBe(true);
    expect(play).toHaveBeenCalled();
    expect(onEnd).toHaveBeenCalled();
  });

  it('returns false when the token is stale before play', async () => {
    const fetchMock = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      if (!init || init.method === 'GET') {
        return {
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ available: true }),
        };
      }
      return {
        ok: true,
        blob: async () => new Blob([new Uint8Array([9])], { type: 'audio/mpeg' }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:stale',
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal(
      'Audio',
      class {
        play = vi.fn();
      }
    );

    const played = await speakWithOpenAI('Stale line.', {
      token: 1,
      isCurrent: () => false,
      onEnd: vi.fn(),
    });
    expect(played).toBe(false);
  });
});
