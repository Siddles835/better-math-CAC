import { createFeatures } from './features';
import { predictRecommendation } from './model';

const testStudent = createFeatures({
  planet: 4,
  lessonDifficulty: 4,

  correctAnswers: 9,
  totalAnswers: 10,

  totalTimeSeconds: 50,

  hints: 0,
  retries: 0,

  improvement: 5,
  consistency: 90,
  streak: 5,
});

const recommendation = predictRecommendation(testStudent);

console.log('ML TEST');
console.log('Student features:', testStudent);
console.log('Recommendation:', recommendation);

export { recommendation };