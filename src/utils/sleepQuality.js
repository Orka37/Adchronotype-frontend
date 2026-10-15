export const RATING_SCALE = 'rating_1_10';
export const LEGACY_SCALE = 'legacy_0_21';

// Missing metadata always means the historical scale, never an inferred conversion.
export function sleepQualityAverages(records) {
  const groups = { [RATING_SCALE]: [], [LEGACY_SCALE]: [] };
  for (const record of records) {
    const scale = record.quality_scale || LEGACY_SCALE;
    const value = record.quality_score;
    const min = scale === RATING_SCALE ? 1 : 0;
    const max = scale === RATING_SCALE ? 10 : 21;
    if (groups[scale] && Number.isFinite(value) && value >= min && value <= max) groups[scale].push(value);
  }
  return Object.fromEntries(Object.entries(groups).map(([scale, values]) => [scale,
    values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
  ]));
}
