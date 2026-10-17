import { tx } from '@/i18n/tx';
import React, { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, SwitchCamera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { haveSeenCaptureTips, markCaptureTipsSeen } from '@/lib/objects/captureTips';
import {
  isNativeCameraAvailable,
  nativeChooseFromGallery,
  nativeTakePhoto,
} from '@/lib/objects/nativeCamera';
import { cn } from '@/lib/utils';

type CameraMode = 'starting' | 'live' | 'denied' | 'unavailable';

export interface CaptureFlowProps {
  onCapture: (blob: Blob) => void;
  onCancel: () => void;
  error?: string;
}

const CaptureFlow: React.FC<CaptureFlowProps> = ({ onCapture, onCancel, error }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<CameraMode>('starting');
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [canFlip, setCanFlip] = useState(false);
  const [showTips, setShowTips] = useState(() => !haveSeenCaptureTips());
  const [nativeOk, setNativeOk] = useState(false);
  const [busy, setBusy] = useState(false);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const startWebCamera = async (nextFacing: 'environment' | 'user') => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMode('unavailable');
      return;
    }
    stopStream();
    setMode('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: nextFacing } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => undefined);
      }
      setFacing(nextFacing);
      setMode('live');
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setCanFlip(devices.filter((d) => d.kind === 'videoinput').length > 1);
      } catch {
        setCanFlip(false);
      }
    } catch {
      setMode('denied');
    }
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const native = await isNativeCameraAvailable();
      if (cancelled) return;
      setNativeOk(native);
      if (native) {
        // Native apps use the system camera UI; keep a calm non-blank fallback surface.
        setMode('unavailable');
        return;
      }
      await startWebCamera('environment');
    })();
    return () => {
      cancelled = true;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only camera bootstrap
  }, []);

  const dismissTips = () => {
    markCaptureTipsSeen();
    setShowTips(false);
  };

  const shutter = async () => {
    const video = videoRef.current;
    if (!video || mode !== 'live' || busy) return;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    setBusy(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92)
      );
      if (blob) {
        dismissTips();
        stopStream();
        onCapture(blob);
      }
    } finally {
      setBusy(false);
    }
  };

  const onFile = (file: File | null) => {
    if (!file) return;
    dismissTips();
    stopStream();
    onCapture(file);
  };

  const runNativeTake = async () => {
    setBusy(true);
    try {
      const blob = await nativeTakePhoto();
      if (blob) {
        dismissTips();
        onCapture(blob);
      }
    } catch {
      /* stay on calm fallback */
    } finally {
      setBusy(false);
    }
  };

  const runNativeGallery = async () => {
    setBusy(true);
    try {
      const blob = await nativeChooseFromGallery();
      if (blob) {
        dismissTips();
        onCapture(blob);
      }
    } catch {
      /* stay on calm fallback */
    } finally {
      setBusy(false);
    }
  };

  const flip = () => {
    const next = facing === 'environment' ? 'user' : 'environment';
    void startWebCamera(next);
  };

  const calmFallback = mode === 'denied' || mode === 'unavailable' || nativeOk;

  return (
    <section className="rounded-2xl border border-border bg-card p-6 space-y-4" data-testid="objects-capture">
      <h2 className="text-xl font-semibold">{tx('objects:captureTitle')}</h2>

      {showTips && (
        <div
          className="rounded-xl border border-border bg-muted/40 p-4 space-y-2"
          role="status"
          data-testid="objects-tips"
        >
          <p className="font-medium">{tx('objects:tipsTitle')}</p>
          <ul className="list-disc ps-5 text-sm text-muted-foreground space-y-1">
            <li>{tx('objects:tipPlain')}</li>
            <li>{tx('objects:tipOne')}</li>
            <li>{tx('objects:tipFill')}</li>
          </ul>
          <Button type="button" variant="ghost" className="min-h-[48px]" onClick={dismissTips}>
            {tx('objects:tipsGotIt')}
          </Button>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {!calmFallback && (
        <div className="relative overflow-hidden rounded-2xl bg-black aspect-[3/4] max-h-[50vh]">
          {mode === 'starting' && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-white/80 p-4 text-center">
              {tx('objects:cameraStarting')}
            </p>
          )}
          <video
            ref={videoRef}
            className={cn('h-full w-full object-cover', mode !== 'live' && 'opacity-0')}
            playsInline
            muted
            autoPlay
            aria-label={tx('objects:cameraPreview')}
          />
        </div>
      )}

      {calmFallback && (
        <div
          className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center space-y-2"
          data-testid="objects-camera-fallback"
        >
          <Camera className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden />
          <p className="font-medium">{tx('objects:cameraDeniedTitle')}</p>
          <p className="text-sm text-muted-foreground">{tx('objects:cameraDeniedLead')}</p>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        data-testid="objects-file-input"
        onChange={(event) => {
          onFile(event.target.files?.[0] ?? null);
          event.target.value = '';
        }}
      />

      <div className="flex flex-col gap-2">
        {mode === 'live' && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="min-h-[48px] flex-1"
              data-testid="objects-shutter"
              disabled={busy}
              onClick={() => void shutter()}
            >
              <Camera className="me-2 h-5 w-5" aria-hidden />
              {tx('objects:shutter')}
            </Button>
            {canFlip && (
              <Button
                type="button"
                variant="outline"
                className="min-h-[48px]"
                data-testid="objects-flip"
                onClick={flip}
                aria-label={tx('objects:flipCamera')}
              >
                <SwitchCamera className="h-5 w-5" aria-hidden />
              </Button>
            )}
          </div>
        )}

        {nativeOk && (
          <Button
            type="button"
            className="min-h-[48px] w-full"
            data-testid="objects-native-take"
            disabled={busy}
            onClick={() => void runNativeTake()}
          >
            <Camera className="me-2 h-5 w-5" aria-hidden />
            {tx('objects:takePhoto')}
          </Button>
        )}

        <Button
          type="button"
          variant={mode === 'live' ? 'outline' : 'default'}
          className="min-h-[48px] w-full"
          data-testid="objects-pick-file"
          disabled={busy}
          onClick={() => {
            if (nativeOk) void runNativeGallery();
            else fileRef.current?.click();
          }}
        >
          <ImagePlus className="me-2 h-5 w-5" aria-hidden />
          {tx('objects:choosePhoto')}
        </Button>

        <Button type="button" variant="ghost" className="min-h-[48px]" onClick={onCancel}>
          {tx('objects:cancel')}
        </Button>
      </div>
    </section>
  );
};

export default CaptureFlow;
