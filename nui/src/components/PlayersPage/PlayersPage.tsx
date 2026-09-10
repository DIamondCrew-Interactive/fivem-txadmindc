import React from "react";
import { Box, styled } from "@mui/material";
import { PlayerPageHeader } from "./PlayerPageHeader";
import { useFilteredSortedPlayers } from "../../state/players.state";
import { PlayersListEmpty } from "./PlayersListEmpty";
import { PlayersListGrid } from "./PlayersListGrid";
import { usePlayerListListener } from "../../hooks/usePlayerListListener";

const RootStyled = styled(Box)(() => ({
  background: "rgba(8, 13, 18, 0.56)",
  border: "1px solid rgba(243, 211, 107, 0.34)",
  borderRadius: 15,
  boxShadow: "none",
  overflow: "hidden",
  backdropFilter: "blur(3px)",
  height: "50vh",
  flex: 1,
}));

const GridStyled = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  height: "85%",
}));

export const PlayersPage: React.FC<{ visible: boolean }> = ({ visible }) => {
  const players = useFilteredSortedPlayers();

  usePlayerListListener();

  return (
    <RootStyled
      mt={2}
      mb={10}
      pt={4}
      px={4}
      display={visible ? "initial" : "none"}
    >
      <PlayerPageHeader />
      <GridStyled>
        {players.length ? <PlayersListGrid /> : <PlayersListEmpty />}
      </GridStyled>
    </RootStyled>
  );
};
