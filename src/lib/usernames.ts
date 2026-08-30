// Random, kid-friendly username generator.
//
// Students never type their own name: usernames are generated on-device from
// safe word lists plus a number, so MathLift never collects real names
// (App Store Guidelines 1.6 / 5.1 and COPPA data minimisation). Students can
// re-roll as many times as they like before joining.

const ADJECTIVES = [
  'Brave', 'Bright', 'Calm', 'Clever', 'Cosmic', 'Curious', 'Daring', 'Eager',
  'Gentle', 'Giant', 'Happy', 'Jolly', 'Kind', 'Lucky', 'Mighty', 'Nimble',
  'Quick', 'Quiet', 'Shiny', 'Silly', 'Smart', 'Sparky', 'Speedy', 'Sunny',
  'Super', 'Swift', 'Tiny', 'Wise', 'Zippy', 'Stellar',
];

const ANIMALS = [
  'Badger', 'Bear', 'Bunny', 'Comet', 'Dolphin', 'Dragon', 'Eagle', 'Falcon',
  'Fox', 'Gecko', 'Koala', 'Lion', 'Meteor', 'Moose', 'Otter', 'Owl',
  'Panda', 'Penguin', 'Planet', 'Puma', 'Robin', 'Rocket', 'Seal', 'Star',
  'Tiger', 'Turtle', 'Whale', 'Wolf', 'Yak', 'Zebra',
];

const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

/** e.g. "BraveTiger42" — no real names, unlimited re-rolls. */
export const generateUsername = (): string => {
  const number = Math.floor(Math.random() * 90) + 10; // 10–99
  return `${pick(ADJECTIVES)}${pick(ANIMALS)}${number}`;
};
