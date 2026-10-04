import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AccessibilityQuickButton from '@/components/AccessibilityQuickButton';
import VoiceQuickButton from '@/components/VoiceQuickButton';
import { Button } from '@/components/ui/button';
import { useAccessibility } from '@/context/AccessibilityContext';
import { EXPLORE_CATALOG, loadExploreCollection, type ExploreCollectionItem } from '@/lib/explore';
import { getActiveStudent } from '@/lib/session';
import { STUDENT_HUB_PATH } from '@/lib/studentHub';

const ExplorePage: React.FC = () => {
  const { t } = useTranslation('explore');
  const navigate = useNavigate();
  const { prefs } = useAccessibility();
  const [collection, setCollection] = useState<ExploreCollectionItem[]>([]);

  useEffect(() => {
    if (!getActiveStudent()) {
      navigate('/', { replace: true });
      return;
    }
    setCollection(loadExploreCollection());
  }, [navigate]);

  return (
    <div
      className={`min-h-screen bg-background ${prefs.calmBackground ? '' : 'subtle-stars'} px-4 py-6`}
      data-testid="explore-hub"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="outline" className="min-h-11" onClick={() => navigate(STUDENT_HUB_PATH)}>
            {t('back_planets')}
          </Button>
          <div className="flex items-center gap-2">
            <VoiceQuickButton />
            <AccessibilityQuickButton />
          </div>
        </div>

        <header className="text-center space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('solar_moon')}
          </p>
          <h1 className="text-3xl font-semibold text-foreground">{t('hub_title')}</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">{t('hub_blurb')}</p>
          <p className="text-sm text-muted-foreground">{t('untimed_note')}</p>
        </header>

        <ul className="grid gap-3 sm:grid-cols-2 list-none p-0 m-0">
          {EXPLORE_CATALOG.map((activity) => (
            <li key={activity.id}>
              <Link
                to={`/explore/${activity.id}`}
                data-testid={`explore-link-${activity.id}`}
                className="block min-h-[7rem] rounded-2xl border border-border/80 bg-card/30 p-4 text-start transition hover:border-sky-400/50 hover:bg-card/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
              >
                <h2 className="text-lg font-semibold text-foreground mb-1">
                  {activity.id === 'make-ten' ? t(activity.titleKey, { goal: 10 }) : t(activity.titleKey)}
                </h2>
                <p className="text-sm text-muted-foreground mb-2">{t(activity.blurbKey)}</p>
                <p className="text-xs text-sky-200/80">{t(activity.principleKey)}</p>
              </Link>
            </li>
          ))}
        </ul>

        <section aria-labelledby="collection-heading" className="rounded-2xl border border-border/70 bg-card/20 p-4">
          <h2 id="collection-heading" className="text-lg font-semibold mb-2">
            {t('collection_title')}
          </h2>
          {collection.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('collection_empty')}</p>
          ) : (
            <ul className="space-y-2">
              {collection
                .slice()
                .reverse()
                .map((item) => (
                  <li key={item.id} className="text-sm text-foreground">
                    {item.label} · {t('ways_found', { count: item.waysFound })}
                  </li>
                ))}
            </ul>
          )}
        </section>

        <Link to="/" className="text-sm text-muted-foreground underline underline-offset-2 self-center">
          {t('back_planets')}
        </Link>
      </div>
    </div>
  );
};

export default ExplorePage;
