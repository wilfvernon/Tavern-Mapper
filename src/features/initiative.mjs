export function sortCombatants(combatants) {
  return [...combatants].sort((first, second) => second.score - first.score);
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