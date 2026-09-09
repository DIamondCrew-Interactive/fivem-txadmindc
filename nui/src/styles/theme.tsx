export default {
  name: 'fivem',
  logo: 'images/diamond-circle-logo.png',
  palette: {
    mode: "dark",
    primary: {
      main: "#2EC7FF",
    },
    success: {
      main: "#19D89B",
    },
    warning: {
      main: "#F3D36B",
    },
    error: {
      main: "#F43CB2",
    },
    info: {
      main: "#4A96FF",
    },
    background: {
      default: "#090D11",
      paper: "rgba(17, 24, 32, 0.92)",
    },
    action: {
      selected: "rgba(255, 255, 255, 0.1)",
    },
    secondary: {
      main: "#fff",
    },
    text: {
      primary: "#fff",
      secondary: "rgba(221,221,221,0.54)",
    },
  },
  components: {
    MuiListItem: {
      styleOverrides: {
        root: {
          border: "1px solid transparent",
          "&.Mui-selected": {
            backgroundColor: "rgba(244, 60, 178, 0.16)",
            border: "1px solid rgba(243, 211, 107, 0.42)",
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          border: "1px solid transparent",
          "&.Mui-selected": {
            backgroundColor: "rgba(244, 60, 178, 0.16)",
            border: "1px solid rgba(243, 211, 107, 0.42)",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "unset"
        }
      }
    },
  },
} as const;
