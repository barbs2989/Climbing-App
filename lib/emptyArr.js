
// Stable empty array for query fallbacks — a fresh [] each render would change identity
// every time and invalidate every useMemo that depends on it.
export const EMPTY_ARR=[];
