import type { ExploreActivityId } from './types';

export interface ExploreActivityMeta {
  id: ExploreActivityId;
  /** i18n key under explore namespace */
  titleKey: string;
  blurbKey: string;
  principleKey: string;
}

export const EXPLORE_CATALOG: ExploreActivityMeta[] = [
  {
    id: 'show-me',
    titleKey: 'act_show_me',
    blurbKey: 'act_show_me_blurb',
    principleKey: 'principle_many_ways',
  },
  {
    id: 'quick-look',
    titleKey: 'act_quick_look',
    blurbKey: 'act_quick_look_blurb',
    principleKey: 'principle_subitize',
  },
  {
    id: 'number-talk',
    titleKey: 'act_number_talk',
    blurbKey: 'act_number_talk_blurb',
    principleKey: 'principle_notice',
  },
  {
    id: 'wodb',
    titleKey: 'act_wodb',
    blurbKey: 'act_wodb_blurb',
    principleKey: 'principle_many_reasons',
  },
  {
    id: 'make-ten',
    titleKey: 'act_make_ten',
    blurbKey: 'act_make_ten_blurb',
    principleKey: 'principle_decompose',
  },
  {
    id: 'number-line',
    titleKey: 'act_number_line',
    blurbKey: 'act_number_line_blurb',
    principleKey: 'principle_line',
  },
  {
    id: 'build-story',
    titleKey: 'act_build_story',
    blurbKey: 'act_build_story_blurb',
    principleKey: 'principle_story',
  },
  {
    id: 'pattern-skip',
    titleKey: 'act_pattern_skip',
    blurbKey: 'act_pattern_skip_blurb',
    principleKey: 'principle_pattern',
  },
];

export const isExploreActivityId = (value: string): value is ExploreActivityId =>
  EXPLORE_CATALOG.some((item) => item.id === value);
