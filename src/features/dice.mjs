export function rollDice(sides, count, modifier, random = Math.random) {
  const rolls = [];
  for (let index = 0; index < count; index++) {
    rolls.push(1 + Math.floor(random() * sides));
  }
  return {
    rolls,
    total: rolls.reduce((sum, value) => sum + value, 0) + modifier,
  };
}