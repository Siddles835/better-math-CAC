import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useExploreBand } from '@/hooks/useExploreBand';
import { isExploreActivityId } from '@/lib/explore';
import { getActiveStudent } from '@/lib/session';
import ShowMeActivity from '@/pages/explore/ShowMeActivity';
import QuickLookActivity from '@/pages/explore/QuickLookActivity';
import NumberTalkActivity from '@/pages/explore/NumberTalkActivity';
import WodbActivity from '@/pages/explore/WodbActivity';
import MakeTenActivity from '@/pages/explore/MakeTenActivity';
import NumberLineActivity from '@/pages/explore/NumberLineActivity';
import BuildStoryActivity from '@/pages/explore/BuildStoryActivity';
import PatternSkipActivity from '@/pages/explore/PatternSkipActivity';

const ExploreActivityPage: React.FC = () => {
  const { activityId = '' } = useParams();
  const navigate = useNavigate();
  const band = useExploreBand();

  useEffect(() => {
    if (!getActiveStudent()) {
      navigate('/', { replace: true });
      return;
    }
    if (!isExploreActivityId(activityId)) {
      navigate('/explore', { replace: true });
    }
  }, [activityId, navigate]);

  if (!isExploreActivityId(activityId)) return null;

  switch (activityId) {
    case 'show-me':
      return <ShowMeActivity band={band} />;
    case 'quick-look':
      return <QuickLookActivity band={band} />;
    case 'number-talk':
      return <NumberTalkActivity band={band} />;
    case 'wodb':
      return <WodbActivity band={band} />;
    case 'make-ten':
      return <MakeTenActivity band={band} />;
    case 'number-line':
      return <NumberLineActivity band={band} />;
    case 'build-story':
      return <BuildStoryActivity band={band} />;
    case 'pattern-skip':
      return <PatternSkipActivity band={band} />;
    default:
      return null;
  }
};

export default ExploreActivityPage;
