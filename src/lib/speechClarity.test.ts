// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { prepareClearPlayback, unlockSpeechClarity } from './speechClarity';

describe('speechClarity', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sets full volume even when Web Audio is unavailable', () => {
    const audio = {
      volume: 0.4,
      preservesPitch: false,
    } as unknown as HTMLAudioElement;

    prepareClearPlayback(audio);
    expect(audio.volume).toBe(1);
    expect((audio as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch).toBe(true);
  });

  it('wires a clarity graph once when AudioContext exists', () => {
    const connect = vi.fn();
    const destination = {};
    const nodes = {
      highpass: { type: '', frequency: { value: 0 }, Q: { value: 0 }, connect },
      presence: {
        type: '',
        frequency: { value: 0 },
        Q: { value: 0 },
        gain: { value: 0 },
        connect,
      },
      air: { type: '', frequency: { value: 0 }, gain: { value: 0 }, connect },
      compressor: {
        threshold: { value: 0 },
        knee: { value: 0 },
        ratio: { value: 0 },
        attack: { value: 0 },
        release: { value: 0 },
        connect,
      },
      makeup: { gain: { value: 0 }, connect },
    };
    const created: string[] = [];
    const source = { connect };
    class FakeAudioContext {
      state = 'running';
      destination = destination;
      resume = vi.fn().mockResolvedValue(undefined);
      createMediaElementSource = vi.fn(() => source);
      createBiquadFilter = vi.fn(() => {
        if (!created.includes('highpass')) {
          created.push('highpass');
          return nodes.highpass;
        }
        if (!created.includes('presence')) {
          created.push('presence');
          return nodes.presence;
        }
        created.push('air');
        return nodes.air;
      });
      createDynamicsCompressor = vi.fn(() => nodes.compressor);
      createGain = vi.fn(() => nodes.makeup);
    }
    vi.stubGlobal('AudioContext', FakeAudioContext);

    const audio = { volume: 0.2 } as unknown as HTMLAudioElement;
    prepareClearPlayback(audio);
    prepareClearPlayback(audio); // second call should not re-wire

    expect(audio.volume).toBe(1);
    expect(connect).toHaveBeenCalled();
    unlockSpeechClarity();
  });
});
