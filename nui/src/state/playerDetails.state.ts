import {
  atom,
  selector,
  useRecoilState,
  useRecoilValue,
  useSetRecoilState,
} from "recoil";
import { fetchWebPipe } from "../utils/fetchWebPipe";
import { debugLog } from "../utils/debugLog";
import { MockedPlayerDetails } from "../utils/constants";
import { PlayerData } from "../hooks/usePlayerListListener";
import { PlayerModalResp, PlayerModalSuccess } from "@shared/playerApiTypes";
import { GenericApiErrorResp } from "@shared/genericApiTypes";

const forcePlayerRefreshState = atom<number>({
  key: "forcePlayerRefresh",
  default: 0,
});

const associatedPlayerState = atom<PlayerData | null>({
  key: "associatedPlayerDetails",
  default: null,
});

const selectedPlayerDataState = selector<PlayerModalResp | undefined>({
  key: "selectedPlayerDetails",
  get: async ({ get }) => {
    get(forcePlayerRefreshState);
    const assocPlayer = get(associatedPlayerState);
    if (!assocPlayer) return;
    const assocPlayerId = assocPlayer.id;

    const res = await fetchWebPipe<PlayerModalResp>(
      `/player?mutex=current&netid=${assocPlayerId}`,
      { mockData: MockedPlayerDetails }
    );
    debugLog("FetchWebPipe", res, "PlayerFetch");

    if (!res) {
      return { error: 'Player details endpoint was not found.' };
    } else if ("error" in res) {
      return { error: (res as GenericApiErrorResp).error };
    } else if ("player" in res) {
      const player = (res as PlayerModalSuccess).player;
      if (player.isConnected) {
        return res;
      } else {
        return { error: 'This player is no longer connected to the server.' };
      }
    }else{
      return { error: 'Unknown error :(' };
    }
  },
});

export const usePlayerDetailsValue = () => {
  const playerDetails = useRecoilValue<PlayerModalResp | undefined>(selectedPlayerDataState);
  if (!playerDetails) {
    throw new Error("No player details selected.");
  }
  return playerDetails;
};

export const useForcePlayerRefresh = () =>
  useSetRecoilState(forcePlayerRefreshState);

export const useAssociatedPlayerValue = () => {
  const player = useRecoilValue<PlayerData | null>(associatedPlayerState);
  if (!player) {
    throw new Error("No associated player selected.");
  }
  return player;
};

export const useSetAssociatedPlayer = () =>
  useSetRecoilState<PlayerData | null>(associatedPlayerState);
