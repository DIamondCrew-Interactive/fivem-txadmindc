import React from "react";
import { Box, styled } from "@mui/material";
import { PlayerPageHeader } from "./PlayerPageHeader";
import { useFilteredSortedPlayers } from "../../state/players.state";
import { PlayersListEmpty } from "./PlayersListEmpty";
import { PlayersListGrid } from "./PlayersListGrid";
import { usePlayerListListener } from "../../hooks/usePlayerListListener";

const RootStyled = styled(Box)(({ theme }) => ({
  background:
    "linear-gradient(135deg, rgba(8, 13, 18, 0.96), rgba(15, 18, 28, 0.94))",
  border: "1px solid rgba(243, 211, 107, 0.22)",
  boxShadow: "0 24px 80px rgba(0, 0, 0, 0.52)",
  backdropFilter: "blur(14px)",
  height: "62vh",
  maxHeight: 680,
  minHeight: 430,
  borderRadius: 12,
  flex: 1,
  overflow: "hidden",
}));

const GridStyled = styled(Box)(() => ({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minHeight: 0,
}));

export const PlayersPage: React.FC<{ visible: boolean }> = ({ visible }) => {
  const players = useFilteredSortedPlayers();

  usePlayerListListener();

  return (
    <RootStyled
      mt={2}
      mb={10}
      pt={3}
      px={3}
      display={visible ? "flex" : "none"}
      flexDirection="column"
    >
      <PlayerPageHeader />
      <GridStyled>
        {players.length ? <PlayersListGrid /> : <PlayersListEmpty />}
      </GridStyled>
    </RootStyled>
  );
};
