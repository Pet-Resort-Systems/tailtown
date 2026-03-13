import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { BarChartProps } from './types';

/**
 * Actual BarChart component using recharts
 * This is lazy-loaded to reduce initial bundle size
 */
const BarChartComponent: React.FC<BarChartProps> = ({
  data,
  dataKey,
  xAxisKey,
  height = 300,
  color = '#8884d8'
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xAxisKey} />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey={dataKey} fill={color} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default BarChartComponent;
