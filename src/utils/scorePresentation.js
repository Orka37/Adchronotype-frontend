export function scorePresentation(score, colors) {
  if (score == null || !Number.isFinite(Number(score))) return { label: '—', color: null, value: '—' };
  const n = Number(score);
  return { textColor: colors ? (n >= 60 ? colors.errorText : n >= 30 ? colors.warningStrong : colors.successText) : null, label: n >= 60 ? 'Higher Similarity' : n >= 30 ? 'Moderate Similarity' : 'Lower Similarity', color: n >= 60 ? '#D9694F' : n >= 30 ? '#E9A94A' : '#7EC49A', value: `${n.toFixed(1)}%` };
}
