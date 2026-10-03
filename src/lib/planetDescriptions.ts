import i18n from '@/i18n/setup';

type Lesson = 'counting' | 'addition' | 'subtraction';
type Planet = 'mercury' | 'venus' | 'earth' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'sun';

const descriptions: Record<string, string> = {
  'sun-counting': 'Count the things you see, one at a time.',
  'mercury-counting': 'Put the right number of apples in the basket.',
  'venus-counting': 'Listen to a short story, then count.',
  'earth-addition': 'Add pencils slowly and see the new total.',
  'mars-addition': 'Build an adding story with two groups.',
  'jupiter-addition': 'Add bigger numbers and check the total.',
  'saturn-subtraction': 'Take pencils away and see what is left.',
  'uranus-subtraction': 'Take away the number the story asks for.',
  'neptune-subtraction': 'Solve a short take-away story.',
  'mercury-addition': 'Add small groups, up to ten.',
  'venus-addition': 'Add two small numbers.',
  'mars-counting': 'Count a group, then say how many.',
  'jupiter-counting': 'Count by making groups of ten.',
  'saturn-counting': 'Count what is left after some go away.',
  'uranus-counting': 'Count on from a number you already have.',
  'neptune-counting': 'Count up to a bigger number.',
  'earth-counting': 'Count two groups, then say the total.',
  'sun-addition': 'See two groups join into one total.',
  'sun-subtraction': 'See some things go away.',
  'mercury-subtraction': 'Take a few away from a small group.',
  'venus-subtraction': 'Take away and count what is left.',
  'earth-subtraction': 'Start with some pencils and give a few away.',
  'mars-subtraction': 'Take away the smaller group.',
  'jupiter-subtraction': 'Take tens and ones away.',
  'saturn-addition': 'Add on to a number you already have.',
  'uranus-addition': 'Add a ten and some ones.',
  'neptune-addition': 'Add two numbers and say the total.',
};

export const planetDescriptions = descriptions;

export const getDescription = (planet: Planet, lesson: Lesson) => {
  const key = `ui:desc_${planet}_${lesson}`;
  const fallback = descriptions[`${planet}-${lesson}`] || '';
  const translated = i18n.t(key, { defaultValue: fallback });
  return translated === key ? fallback : translated;
};
