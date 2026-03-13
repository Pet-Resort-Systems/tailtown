import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#126f9f', // New blue color
      light: '#3a8db8', // Lighter shade for hover states
      dark: '#0b4d6f', // Darker shade for pressed states
      contrastText: '#FFFFFF', // White text for better readability
    },
    secondary: {
      main: '#4C8BF5', // Original blue as secondary color
    },
  },
});

export default theme;
