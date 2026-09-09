import React from "react";
import { Box, styled } from "@mui/material";
import { PlayerPageHeader } from "./PlayerPageHeader";
import { useFilteredSortedPlayers } from "../../state/players.state";
import { PlayersListEmpty } from "./PlayersListEmpty";
import { PlayersListGrid } from "./PlayersListGrid";
import { usePlayerListListener } from "../../hooks/usePlayerListListener";

const RootStyled = styled(Box)(() => ({
  height: "52vh",
  maxHeight: 590,
  minHeight: 360,
  flex: 1,
  overflow: "visible",
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
      pt={1}
      px={1}
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
