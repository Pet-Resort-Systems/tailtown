import { GridProps } from '@mui/material';

export type ExtendedGridProps = GridProps & {
  component?: React.ElementType;
};
