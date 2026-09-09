import React from "react";
import { Box, Collapse, styled, Typography, useTheme } from "@mui/material";
import { PageTabs} from "@nui/src/components/misc/PageTabs";
import { txAdminMenuPage, usePageValue } from "@nui/src/state/page.state";
import { MainPageList } from "@nui/src/components/MainPage/MainPageList";
import { useServerCtxValue } from "@nui/src/state/server.state";
import { useDebounce } from "@nui/src/hooks/useDebouce";

interface TxAdminLogoProps {
  logo: string;
}

const TxAdminLogo: React.FC<TxAdminLogoProps> = ({ logo }) => {
  return (
    <Box mt={0.5} mb={1.5} display="flex" flexDirection="column" alignItems="center">
      <Box
        component="img"
        src={logo}
        alt="Server logo"
        sx={{
          width: 92,
          height: 92,
          filter: "drop-shadow(0 0 18px rgba(244, 60, 178, 0.34))",
        }}
      />
      <Typography
        component="div"
        sx={{
          mt: 0.75,
          lineHeight: 0.95,
          textAlign: "center",
          fontWeight: 900,
          background: "linear-gradient(90deg, #2EC7FF, #F43CB2, #F3D36B)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        <Box component="span" display="block" fontSize={18}>DiamondCrew</Box>
        <Box component="span" display="block" fontSize={12}>Interactive</Box>
      </Typography>
    </Box>
  )
};

const StyledRoot = styled(Box)(({ theme }) => ({
  height: "fit-content",
  background: `
    linear-gradient(122deg, rgba(255, 243, 170, 0.15) 0 1px, transparent 1px 46%),
    radial-gradient(circle at 18% 6%, rgba(46, 199, 255, 0.22), transparent 28%),
    radial-gradient(circle at 88% 0%, rgba(244, 60, 178, 0.18), transparent 34%),
    ${theme.palette.background.paper}
  `,
  width: 325,
  border: "1px solid rgba(243, 211, 107, 0.32)",
  borderRadius: 12,
  boxShadow: "0 22px 55px rgba(0, 0, 0, 0.48), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  userSelect: "none",
  position: "relative",
  "&::before": {
    content: '""',
    position: "absolute",
    inset: 0,
    opacity: 0.24,
    pointerEvents: "none",
    background: "radial-gradient(ellipse 35px 48px at 50% 0%, rgba(255,255,255,0.11), transparent 68%) 0 0 / 78px 88px",
  },
  "& > *": {
    position: "relative",
  },
}));

export const MenuRootContent: React.FC = React.memo(() => {
  const theme = useTheme();
  const serverCtx = useServerCtxValue();
  const curPage = usePageValue()
  const padSize = Math.max(0, 9 - serverCtx.txAdminVersion.length);
  const versionPad = "\u0020\u205F".repeat(padSize);

  // Hack to prevent collapse transition from breaking
  // In some cases, i.e, when setting target player from playerModal
  // Collapse transition can break due to multiple page updates within a short
  // time frame
  const debouncedCurPage = useDebounce(curPage, 50)

  return (
    <StyledRoot p={2} pb={1}>
      <TxAdminLogo logo={theme.logo} />
      <Typography
        color="textSecondary"
        style={{
          fontWeight: 500,
          marginTop: -4,
          marginBottom: 8,
          textAlign: "center",
          fontSize: 12,
        }}
      >
        v{serverCtx.txAdminVersion}
        {versionPad}
      </Typography>
      <PageTabs />
      <Collapse
        in={debouncedCurPage === txAdminMenuPage.Main}
        unmountOnExit
        mountOnEnter
      >
        <MainPageList />
      </Collapse>
    </StyledRoot>)
});
