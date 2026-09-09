import React, { memo } from "react";
import { Box, Paper, Theme, Tooltip, Typography, styled } from "@mui/material";
import {
  DirectionsBoat,
  DirectionsWalk,
  DriveEta,
  LiveHelp,
  TwoWheeler,
  Flight,
} from "@mui/icons-material";
import { useSetAssociatedPlayer } from "../../state/playerDetails.state";
import { formatDistance } from "../../utils/miscUtils";
import { useTranslate } from "react-polyglot";
import { PlayerData, VehicleStatus } from "../../hooks/usePlayerListListener";
import { useSetPlayerModalVisibility } from "@nui/src/state/playerModal.state";

const PREFIX = "PlayerCard";

const classes = {
  paper: `${PREFIX}-paper`,
  barBackground: `${PREFIX}-barBackground`,
  barInner: `${PREFIX}-barInner`,
  icon: `${PREFIX}-icon`,
  tooltipOverride: `${PREFIX}-tooltipOverride`,
  mugshot: `${PREFIX}-mugshot`,
  mugshotFallback: `${PREFIX}-mugshotFallback`,
};

const StyledBox = styled(Box)(({ theme }) => ({
  [`& .${classes.paper}`]: {
    padding: "14px 16px",
    borderRadius: 10,
    cursor: "pointer",
    background:
      "linear-gradient(135deg, rgba(24, 30, 42, 0.96), rgba(18, 23, 33, 0.92))",
    border: "1px solid rgba(46, 199, 255, 0.12)",
    boxShadow: "0 12px 28px rgba(0, 0, 0, 0.24)",
    transition: "border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease",
    "&:hover": {
      background:
        "linear-gradient(135deg, rgba(33, 41, 58, 0.98), rgba(23, 29, 42, 0.96))",
      borderColor: "rgba(244, 60, 178, 0.45)",
      boxShadow: "0 16px 36px rgba(244, 60, 178, 0.14)",
      transform: "translateY(-1px)",
    },
  },

  [`& .${classes.barBackground}`]: {
    background: theme.palette.primary.dark,
    height: 5,
    borderRadius: 10,
    overflow: "hidden",
  },

  [`& .${classes.barInner}`]: {
    height: "100%",
    background: theme.palette.primary.main,
  },

  [`& .${classes.icon}`]: {
    paddingRight: 8,
    color: theme.palette.primary.main,
    display: "inline-flex",
    alignItems: "center",
  },

  [`& .${classes.tooltipOverride}`]: {
    fontSize: 12,
  },

  [`& .${classes.mugshot}`]: {
    width: 48,
    height: 48,
    borderRadius: 10,
    objectFit: "cover",
    marginRight: 12,
    border: "1px solid rgba(243, 211, 107, 0.42)",
    background: "rgba(255, 255, 255, 0.05)",
    boxShadow: "0 10px 24px rgba(0, 0, 0, 0.22)",
    flex: "0 0 auto",
  },

  [`& .${classes.mugshotFallback}`]: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginRight: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#071016",
    fontWeight: 800,
    border: "1px solid rgba(243, 211, 107, 0.42)",
    background: "linear-gradient(135deg, #2EC7FF, #F43CB2)",
    boxShadow: "0 10px 24px rgba(0, 0, 0, 0.22)",
    flex: "0 0 auto",
  },
}));

const determineHealthBGColor = (val: number) => {
  if (val === -1) return "#4A4243";
  else if (val <= 20) return "#4a151b";
  else if (val <= 60) return "#624d18";
  else return "#097052";
};

const determineHealthColor = (val: number, theme: Theme) => {
  if (val === -1) return "#4A4243";
  else if (val <= 20) return theme.palette.error.light;
  else if (val <= 60) return theme.palette.warning.light;
  else return theme.palette.success.light;
};

const HealthBarBackground = styled(Box, {
  shouldForwardProp: (prop) => prop !== "healthVal",
})<{ healthVal: number }>(({ healthVal }) => ({
  background: determineHealthBGColor(healthVal),
  height: 5,
  borderRadius: 10,
  overflow: "hidden",
}));

const HealthBar = styled(Box, {
  shouldForwardProp: (prop) => prop !== "healthVal",
})<{ healthVal: number }>(({ theme, healthVal }) => ({
  background: determineHealthColor(healthVal, theme),
  height: 5,
  borderRadius: 10,
  overflow: "hidden",
}));

const PlayerCard: React.FC<{ playerData: PlayerData }> = ({ playerData }) => {
  const setModalOpen = useSetPlayerModalVisibility();
  const setAssociatedPlayer = useSetAssociatedPlayer();
  const t = useTranslate();

  const statusIcon: { [K in VehicleStatus]: JSX.Element } = {
    unknown: <LiveHelp color="inherit" />,
    walking: <DirectionsWalk color="inherit" />,
    driving: <DriveEta color="inherit" />,
    boating: <DirectionsBoat color="inherit" />,
    biking: <TwoWheeler color="inherit" />,
    flying: <Flight color="inherit" />,
  };

  const handlePlayerClick = () => {
    setAssociatedPlayer(playerData);
    setModalOpen(true);
  };

  const upperCaseStatus = playerData.vType.charAt(0).toUpperCase() + playerData.vType.slice(1);
  const healthBarSize = Math.max(0, playerData.health);
  const fallbackInitial = playerData.displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <StyledBox>
      <div onClick={handlePlayerClick}>
        <Paper className={classes.paper}>
          <Box display="flex" alignItems="center" pb="12px">
            {playerData.mugshot ? (
              <img
                className={classes.mugshot}
                src={playerData.mugshot}
                alt=""
              />
            ) : (
              <Box className={classes.mugshotFallback}>{fallbackInitial}</Box>
            )}
            <Box flexGrow={1} display="flex" overflow="hidden">
              <Tooltip
                title={upperCaseStatus}
                placement="top"
                arrow
                classes={{
                  tooltip: classes.tooltipOverride,
                }}
              >
                <span className={classes.icon}>
                  {statusIcon[playerData.vType]}
                </span>
              </Tooltip>
              <Typography
                style={{
                  marginRight: 8,
                  minWidth: 30,
                  height: 24,
                  borderRadius: 999,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(255, 255, 255, 0.08)",
                }}
                variant="subtitle1"
                color="textSecondary"
              >
                {playerData.id}
              </Typography>
              <Typography
                style={{ marginLeft: 0, fontWeight: 700 }}
                noWrap
                variant="subtitle1"
                color="textPrimary"
              >
                {playerData.admin && "🛡️"} {playerData.displayName}
              </Typography>
              <Typography
                style={{ marginLeft: 10, minWidth: "fit-content", fontWeight: 600 }}
                noWrap
                variant="subtitle1"
                color="textSecondary"
              >
                {playerData.dist < 0 ? `?? m` : formatDistance(playerData.dist)}
              </Typography>
            </Box>
          </Box>
          <div>
            <Tooltip
              title={t("nui_menu.page_players.card.health", {
                percentHealth: playerData.health ?? '0',
              })}
              placement="bottom"
              arrow
              classes={{
                tooltip: classes.tooltipOverride,
              }}
            >
              <HealthBarBackground healthVal={playerData.health}>
                <HealthBar
                  width={`${healthBarSize}%`}
                  healthVal={playerData.health}
                />
              </HealthBarBackground>
            </Tooltip>
          </div>
        </Paper>
      </div>
    </StyledBox>
  );
};

export default memo(PlayerCard);
