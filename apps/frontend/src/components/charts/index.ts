/**
 * Lazy-loaded chart components
 * These components load recharts library only when needed,
 * reducing the initial bundle size
 */

export { default as LazyBarChart } from './LazyBarChart';
export { default as LazyPieChart } from './LazyPieChart';
export type { BarChartProps, PieChartProps } from './types';
