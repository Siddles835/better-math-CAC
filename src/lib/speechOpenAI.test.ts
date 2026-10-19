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

  it('keeps playing Alloy sample when a late stop from another call is stale', async () => {
    const { playAlloyReferenceSample, stopAlloyReferenceSample } = await import('./speechOpenAI');
    const audioInstances: Array<{
      pause: ReturnType<typeof vi.fn>;
      play: ReturnType<typeof vi.fn>;
      onended: (() => void) | null;
      onerror: (() => void) | null;
    }> = [];
    class FakeAudio {
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
    // Simulate a stale async stopSpeaking callback that ran after play started
    // but was scheduled before — token bump would kill old plays only.
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

  const audioMpegHeaders = { get: (name: string) => (name.toLowerCase() === 'content-type' ? 'audio/mpeg' : null) };
  const jsonHeaders = { get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null) };

  const stubAudio = () => {
    const play = vi.fn().mockResolvedValue(undefined);
    const audioInstances: Array<{
      onended: (() => void) | null;
      onerror: (() => void) | null;
      src: string;
      play: ReturnType<typeof vi.fn>;
      pause: ReturnType<typeof vi.fn>;
    }> = [];
    class FakeAudio {
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';
      preload = '';
      currentTime = 0;
      play = play;
      pause = vi.fn();
      load = vi.fn();
      setAttribute = vi.fn();
      constructor(_src?: string) {
        if (_src) this.src = _src;
        audioInstances.push(this);
      }
    }
    vi.stubGlobal('Audio', FakeAudio);
    return { play, audioInstances };
  };

  it('always sends OpenAI alloy in the POST body', async () => {
    const { setPreferredCloudVoice, DEFAULT_CLOUD_VOICE } = await import('./speechOpenAI');
    setPreferredCloudVoice('sage');
    expect(DEFAULT_CLOUD_VOICE).toBe('alloy');

    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/mpeg' });
    const fetchMock = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      if (!init || init.method === 'GET') {
        return {
          ok: true,
          headers: jsonHeaders,
          json: async () => ({ available: true }),
        };
      }
      return { ok: true, headers: audioMpegHeaders, blob: async () => blob };
    });
    vi.stubGlobal('fetch', fetchMock);
    const { play, audioInstances } = stubAudio();
    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:alloy',
      revokeObjectURL: vi.fn(),
    });

    const pending = speakWithOpenAI('Try alloy.', {
      token: 1,
      isCurrent: () => true,
      ratePref: 'normal',
      voice: 'coral',
    });
    await vi.waitFor(() => expect(audioInstances.length).toBeGreaterThan(0));
    audioInstances[audioInstances.length - 1]?.onended?.();
    await pending;

    const postCall = fetchMock.mock.calls.find((call) => call[1]?.method === 'POST');
    expect(postCall).toBeTruthy();
    const body = JSON.parse(String(postCall?.[1]?.body ?? '{}')) as { voice?: string };
    expect(body.voice).toBe('alloy');
    expect(play).toHaveBeenCalled();
  });

  it('plays mp3 audio from the proxy when current', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/mpeg' });
    const fetchMock = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      if (!init || init.method === 'GET') {
        return {
          ok: true,
          headers: jsonHeaders,
          json: async () => ({ available: true }),
        };
      }
      return { ok: true, headers: audioMpegHeaders, blob: async () => blob };
    });
    vi.stubGlobal('fetch', fetchMock);
    const { play, audioInstances } = stubAudio();
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
    await vi.waitFor(() => expect(audioInstances.length).toBeGreaterThan(0));
    audioInstances[audioInstances.length - 1]?.onended?.();
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
          headers: jsonHeaders,
          json: async () => ({ available: true }),
        };
      }
      return {
        ok: true,
        headers: audioMpegHeaders,
        blob: async () => new Blob([new Uint8Array([9])], { type: 'audio/mpeg' }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:stale',
      revokeObjectURL: vi.fn(),
    });
    stubAudio();

    const played = await speakWithOpenAI('Stale line.', {
      token: 1,
      isCurrent: () => false,
      onEnd: vi.fn(),
    });
    expect(played).toBe(false);
  });

  it('still tries POST when GET probe previously marked unavailable', async () => {
    const blob = new Blob([new Uint8Array([4, 5])], { type: 'audio/mpeg' });
    let postHits = 0;
    const fetchMock = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      if (!init || init.method === 'GET') {
        return {
          ok: true,
          headers: { get: () => 'text/html' },
          json: async () => {
            throw new Error('html');
          },
        };
      }
      postHits += 1;
      return { ok: true, headers: audioMpegHeaders, blob: async () => blob };
    });
    vi.stubGlobal('fetch', fetchMock);
    const { audioInstances } = stubAudio();
    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:retry',
      revokeObjectURL: vi.fn(),
    });

    expect(await ensureCloudTtsAvailable()).toBe(false);
    expect(getCloudTtsStatus()).toBe('unavailable');

    const pending = speakWithOpenAI('Retry alloy.', {
      token: 2,
      isCurrent: () => true,
    });
    await vi.waitFor(() => expect(audioInstances.length).toBeGreaterThan(0));
    audioInstances[audioInstances.length - 1]?.onended?.();
    expect(await pending).toBe(true);
    expect(postHits).toBeGreaterThan(0);
    expect(getCloudTtsStatus()).toBe('available');
  });
});
