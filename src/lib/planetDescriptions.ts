// Placeholder descriptions for each planet + lesson combination.
// Jayanth and Lalith should replace these strings with the final content.

type Lesson = 'counting' | 'addition' | 'subtraction';
type Planet = 'mercury' | 'venus' | 'earth' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'sun';

export const planetDescriptions: Record<string, string> = {
  // Counting
  'mercury-counting': 'Counting on Mercury: Beginner counting activities — placeholder description.',
  'venus-counting': 'Counting on Venus: Placeholder.',
  'earth-counting': 'Counting on Earth: Placeholder.',
  'mars-counting': 'Counting on Mars: Placeholder.',
  'jupiter-counting': 'Counting on Jupiter: Placeholder.',
  'saturn-counting': 'Counting on Saturn: Placeholder.',
  'uranus-counting': 'Counting on Uranus: Placeholder.',
  'neptune-counting': 'Counting on Neptune: Placeholder.',

  // Addition
  'mercury-addition': 'Addition on Mercury: Beginner addition tasks — placeholder.',
  'venus-addition': 'Addition on Venus: Placeholder.',
  'earth-addition': 'Addition on Earth: Placeholder.',
  'mars-addition': 'Addition on Mars: Placeholder.',
  'jupiter-addition': 'Addition on Jupiter: Placeholder.',
  'saturn-addition': 'Addition on Saturn: Placeholder.',
  'uranus-addition': 'Addition on Uranus: Placeholder.',
  'neptune-addition': 'Addition on Neptune: Placeholder.',

  // Subtraction
  'mercury-subtraction': 'Subtraction on Mercury: Beginner subtraction tasks — placeholder.',
  'venus-subtraction': 'Subtraction on Venus: Placeholder.',
  'earth-subtraction': 'Subtraction on Earth: Placeholder.',
  'mars-subtraction': 'Subtraction on Mars: Placeholder.',
  'jupiter-subtraction': 'Subtraction on Jupiter: Placeholder.',
  'saturn-subtraction': 'Subtraction on Saturn: Placeholder.',
  'uranus-subtraction': 'Subtraction on Uranus: Placeholder.',
  'neptune-subtraction': 'Subtraction on Neptune: Placeholder.',
};

export const getDescription = (planet: Planet, lesson: Lesson) => {
  return planetDescriptions[`${planet}-${lesson}`] || '';
};
