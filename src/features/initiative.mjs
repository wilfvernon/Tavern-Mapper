export function sortCombatants(combatants) {
  const ordered = combatants.every(combatant => Number.isFinite(combatant.order));
  return [...combatants].sort(ordered
    ? (first, second) => first.order - second.order
    : (first, second) => second.score - first.score);
}

export function sortCombatantsByScore(combatants) {
  return [...combatants].sort((first, second) => {
    const scoreDifference = second.score - first.score;
    if (scoreDifference !== 0) return scoreDifference;
    return (Number(first.order) || 0) - (Number(second.order) || 0);
  });
}

export function computeHitPoints(combatant) {
  let current = null;
  for (const entry of combatant.hpLog || []) {
    current = entry.type === 'set'
      ? entry.value
      : (current === null ? 0 : current) + entry.value;
  }
  return current;
}