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
      json: async () => ({ available: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const ok = await ensureCloudTtsAvailable();
    expect(ok).toBe(true);
    expect(getCloudTtsStatus()).toBe('available');
    expect(fetchMock).toHaveBeenCalledWith('/api/tts', { method: 'GET' });
  });

  it('plays mp3 audio from the proxy when current', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/mpeg' });
    const fetchMock = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      if (!init || init.method === 'GET') {
        return { ok: true, json: async () => ({ available: true }) };
      }
      return { ok: true, blob: async () => blob };
    });
    vi.stubGlobal('fetch', fetchMock);

    const play = vi.fn().mockResolvedValue(undefined);
    const audioInstances: Array<{ onended: (() => void) | null }> = [];
    class FakeAudio {
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
      voice: DEFAULT_CLOUD_VOICE,
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
        return { ok: true, json: async () => ({ available: true }) };
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
