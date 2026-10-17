import { tx } from '@/i18n/tx';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ImagePlus, Trash2 } from 'lucide-react';
import GroupAnimation from '@/components/animations/GroupAnimation';
import ObjectGlyph from '@/components/objects/ObjectGlyph';
import ReadAloudButton from '@/components/ReadAloudButton';
import { Button } from '@/components/ui/button';
import { prepareStickerFromBlob, likelyContainsFaceHeuristic } from '@/lib/objects/cutout';
import { checkObjectName, guessMany } from '@/lib/objects/nameFilter';
import { loadObjectPrefs, patchObjectPrefs } from '@/lib/objects/prefs';
import { getObjectStore } from '@/lib/objects/store';
import type { ObjectSticker } from '@/lib/objects/types';
import { loadLanguage } from '@/lib/i18n/language';
import { getActiveStudent, getActiveTeacher } from '@/lib/session';
import { isSoloClassCode } from '@/lib/solo';
import { STUDENT_HUB_PATH } from '@/lib/studentHub';
import { cn } from '@/lib/utils';

type Step = 'library' | 'capture' | 'processing' | 'name' | 'preview' | 'grown-up';

const ObjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('library');
  const [items, setItems] = useState<ObjectSticker[]>([]);
  const [stats, setStats] = useState({ photoCount: 0, bytesUsed: 0, sessionOnly: false });
  const [prefs, setPrefs] = useState(loadObjectPrefs());
  const [error, setError] = useState('');
  const [pending, setPending] = useState<{
    full: Blob;
    thumb: Blob;
    width: number;
    height: number;
    segmentation: ObjectSticker['segmentation'];
    previewUrl: string;
  } | null>(null);
  const [one, setOne] = useState('');
  const [many, setMany] = useState('');
  const lang = loadLanguage();

  const refresh = async () => {
    const store = getObjectStore();
    setItems(await store.list());
    setStats(await store.stats());
    setPrefs(loadObjectPrefs());
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(
    () => () => {
      if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl);
    },
    [pending]
  );

  const student = getActiveStudent();
  const teacher = getActiveTeacher();
  const solo = !!(student?.solo || isSoloClassCode(student?.classCode));
  const canCapture = !!teacher || solo || prefs.grownUpUnlocked;

  const startCapture = () => {
    setError('');
    if (solo && !prefs.grownUpUnlocked && !teacher) {
      setStep('grown-up');
      return;
    }
    if (!canCapture && !solo) {
      setError(tx('objects:cameraClassOff'));
      return;
    }
    setStep('capture');
  };

  const onFile = async (file: File | null) => {
    if (!file) return;
    setError('');
    setStep('processing');
    try {
      if (await likelyContainsFaceHeuristic(file)) {
        setError(tx('objects:faceBlocked'));
        setStep('capture');
        return;
      }
      const prepared = await prepareStickerFromBlob(file);
      const previewUrl = URL.createObjectURL(prepared.thumb);
      setPending({ ...prepared, previewUrl });
      setOne('');
      setMany('');
      setStep('name');
    } catch {
      setError(tx('objects:cutoutFail'));
      setStep('capture');
    }
  };

  const saveObject = async () => {
    if (!pending) return;
    const oneCheck = checkObjectName(one);
    const manyCheck = checkObjectName(many || one);
    if (!oneCheck.ok || !manyCheck.ok) {
      setError(tx(`objects:name_${oneCheck.reason ?? manyCheck.reason ?? 'required'}`));
      return;
    }
    const sticker: ObjectSticker = {
      id: crypto.randomUUID(),
      kind: 'photo',
      name: { one: one.trim(), many: (many || one).trim() },
      lang,
      createdAt: Date.now(),
      width: pending.width,
      height: pending.height,
      segmentation: pending.segmentation,
      enabled: true,
    };
    try {
      await getObjectStore().savePhoto(sticker, { full: pending.full, thumb: pending.thumb });
      patchObjectPrefs({ activeId: sticker.id });
      URL.revokeObjectURL(pending.previewUrl);
      setPending(null);
      setStep('library');
      await refresh();
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      setError(code === 'full' || code === 'storage' ? tx('objects:storageFull') : tx('objects:saveFail'));
    }
  };

  return (
    <div className="min-h-screen bg-background subtle-stars p-6" data-testid="objects-page">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold">{tx('objects:title')}</h1>
          <Button type="button" variant="outline" className="min-h-[48px]" onClick={() => navigate(STUDENT_HUB_PATH)}>
            {tx('ui:s_7bb59b2f67')}
          </Button>
        </div>
        <p className="mb-6 text-muted-foreground">{tx('objects:lead')}</p>
        {error && (
          <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {step === 'grown-up' && (
          <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h2 className="text-xl font-semibold">{tx('objects:grownUpTitle')}</h2>
            <p className="text-muted-foreground">{tx('objects:grownUpLead')}</p>
            <Button
              type="button"
              className="min-h-[48px]"
              onClick={() => {
                patchObjectPrefs({ grownUpUnlocked: true });
                setPrefs(loadObjectPrefs());
                setStep('capture');
              }}
            >
              {tx('objects:grownUpConfirm')}
            </Button>
            <Button type="button" variant="ghost" className="min-h-[48px]" onClick={() => setStep('library')}>
              {tx('objects:cancel')}
            </Button>
          </section>
        )}

        {step === 'library' && (
          <section>
            <div className="mb-4 flex flex-wrap gap-2">
              <Button type="button" className="min-h-[48px]" onClick={startCapture} data-testid="objects-add">
                <Camera className="me-2 h-5 w-5" aria-hidden />
                {tx('objects:add')}
              </Button>
              <label className="inline-flex items-center gap-2 text-sm">
                <span>{tx('objects:activeLabel')}</span>
                <select
                  className="min-h-[48px] rounded-xl border border-border bg-background px-3"
                  value={prefs.activeId ?? ''}
                  onChange={(event) => {
                    const value = event.target.value;
                    const next =
                      value === '' ? null : value === 'mix' ? 'mix' : value;
                    setPrefs(patchObjectPrefs({ activeId: next }));
                  }}
                  aria-label={tx('objects:activeLabel')}
                >
                  <option value="">{tx('objects:activeDefault')}</option>
                  <option value="mix">{tx('objects:activeMix')}</option>
                  {items
                    .filter((item) => item.enabled)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name.one}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">
              {tx('objects:storageLine', {
                count: stats.photoCount,
                mb: (stats.bytesUsed / (1024 * 1024)).toFixed(1),
              })}
              {stats.sessionOnly ? ` ${tx('objects:sessionOnly')}` : ''}
            </p>
            {items.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
                {tx('objects:empty')}
              </p>
            ) : (
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {items.map((item) => (
                  <li key={item.id} className="rounded-2xl border border-border bg-card p-3 flex flex-col items-center gap-2">
                    <ObjectGlyph objectId={item.kind === 'builtin' ? `builtin:${item.builtinId}` : item.id} size="lg" label={item.name.one} />
                    <span className="font-medium text-center">{item.name.one}</span>
                    <span className="text-xs text-muted-foreground">{item.name.many}</span>
                    {item.kind === 'photo' && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="min-h-[48px]"
                        onClick={() => void getObjectStore().remove(item.id).then(refresh)}
                        aria-label={tx('objects:delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {step === 'capture' && (
          <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h2 className="text-xl font-semibold">{tx('objects:captureTitle')}</h2>
            <p className="text-muted-foreground">{tx('objects:captureTips')}</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(event) => void onFile(event.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              className="min-h-[48px] w-full"
              data-testid="objects-pick-file"
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus className="me-2 h-5 w-5" aria-hidden />
              {tx('objects:choosePhoto')}
            </Button>
            <Button type="button" variant="ghost" className="min-h-[48px]" onClick={() => setStep('library')}>
              {tx('objects:cancel')}
            </Button>
          </section>
        )}

        {step === 'processing' && (
          <section className="rounded-2xl border border-border bg-card p-8 text-center" aria-live="polite">
            <p className="text-lg font-medium">{tx('objects:processing')}</p>
          </section>
        )}

        {step === 'name' && pending && (
          <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <img src={pending.previewUrl} alt="" className="mx-auto h-40 w-40 object-contain drop-shadow-md" />
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{tx('objects:nameOne')}</span>
              <input
                value={one}
                onChange={(event) => {
                  setOne(event.target.value);
                  if (lang === 'en' || lang === 'es') setMany(guessMany(event.target.value, lang));
                  else if (lang === 'zh-Hans') setMany(event.target.value);
                }}
                className="w-full min-h-[48px] rounded-xl border border-border bg-background px-3"
                maxLength={24}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{tx('objects:nameMany')}</span>
              <input
                value={many}
                onChange={(event) => setMany(event.target.value)}
                className="w-full min-h-[48px] rounded-xl border border-border bg-background px-3"
                maxLength={24}
              />
            </label>
            <div className="flex items-center gap-2">
              <ReadAloudButton text={`${one}. ${many}`} />
            </div>
            <Button type="button" className="min-h-[48px]" onClick={() => setStep('preview')} disabled={!one.trim()}>
              {tx('objects:preview')}
            </Button>
            <Button type="button" variant="ghost" className="min-h-[48px]" onClick={() => setStep('capture')}>
              {tx('objects:tryAgain')}
            </Button>
          </section>
        )}

        {step === 'preview' && pending && (
          <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h2 className="text-xl font-semibold">{tx('objects:previewTitle', { name: many || one })}</h2>
            <GroupAnimation op="add" a={3} b={2} glyph="crayon" />
            <div className={cn('flex flex-wrap justify-center gap-2')}>
              {Array.from({ length: 5 }, (_, index) => (
                <img key={index} src={pending.previewUrl} alt="" className="h-12 w-12 object-contain" />
              ))}
            </div>
            <Button type="button" className="min-h-[48px] w-full" data-testid="objects-save" onClick={() => void saveObject()}>
              {tx('objects:save')}
            </Button>
            <Button type="button" variant="ghost" className="min-h-[48px]" onClick={() => setStep('name')}>
              {tx('objects:back')}
            </Button>
          </section>
        )}
      </div>
    </div>
  );
};

export default ObjectsPage;
