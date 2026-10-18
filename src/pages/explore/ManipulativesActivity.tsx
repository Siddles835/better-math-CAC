import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ExploreShell from '@/components/explore/ExploreShell';
import TenFrame from '@/components/explore/TenFrame';
import ArrayGrid from '@/components/manipulatives/ArrayGrid';
import ManipulativeBoard from '@/components/manipulatives/ManipulativeBoard';
import { WaysFooter, useExploreSave } from './activityHelpers';

const ManipulativesActivity: React.FC = () => {
  const { t } = useTranslation('explore');
  const { persist } = useExploreSave('manipulatives');
  const [ways, setWays] = useState(0);
  const [boardKey, setBoardKey] = useState(0);
  const [boardCount, setBoardCount] = useState(0);
  const [arrayTotal, setArrayTotal] = useState(6);
  const [frame, setFrame] = useState(0);

  const title = t('act_manipulatives');
  const speak = t('manip_prompt');

  return (
    <ExploreShell
      testId="explore-activity-manipulatives"
      title={title}
      speakText={speak}
      footer={
        <WaysFooter
          waysFound={ways}
          onAnother={() => {
            setBoardCount(0);
            setFrame(0);
            setBoardKey((k) => k + 1);
            setWays((n) => n + 1);
          }}
          onSave={() => persist(ways, `${title} · ${boardCount}/${arrayTotal}`)}
        />
      }
    >
      <p className="text-lg text-foreground">{speak}</p>

      <section className="space-y-2" aria-labelledby="manip-board-h">
        <h2 id="manip-board-h" className="text-lg font-semibold">
          {t('manip_board_title')}
        </h2>
        <ManipulativeBoard key={boardKey} initialCount={0} onCountChange={setBoardCount} />
      </section>

      <section className="space-y-2" aria-labelledby="manip-array-h">
        <h2 id="manip-array-h" className="text-lg font-semibold">
          {t('manip_array_title')}
        </h2>
        <ArrayGrid onTotalChange={(total) => setArrayTotal(total)} />
      </section>

      <section className="space-y-2" aria-labelledby="manip-frame-h">
        <h2 id="manip-frame-h" className="text-lg font-semibold">
          {t('manip_frame_title')}
        </h2>
        <div className="flex justify-center">
          <TenFrame
            filled={frame}
            capacity={10}
            onCellClick={(index) => {
              if (index < frame) setFrame(index);
              else setFrame(Math.min(10, frame + 1));
            }}
          />
        </div>
        <p className="text-sm text-muted-foreground text-center" dir="ltr">
          {t('counters_label', { count: frame })}
        </p>
      </section>
    </ExploreShell>
  );
};

export default ManipulativesActivity;
