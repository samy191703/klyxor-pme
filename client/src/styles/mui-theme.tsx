// src/theme/mui-theme.tsx
import { createTheme, ThemeProvider } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: { main: "#0F2A43" },
    secondary: { main: "#C9A646" },
  },
  shape: { borderRadius: 8 },
});

export function MuiThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
