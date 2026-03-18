/**
 * Common types for chart components
 */

export interface BarChartProps {
  data: any[];
  dataKey: string;
  xAxisKey: string;
  height?: number;
  color?: string;
  title?: string;
}

export interface PieChartProps {
  data: any[];
  dataKey: string;
  nameKey: string;
  height?: number;
  colors?: string[];
  title?: string;
}
