// src/stackr/state.ts

import { BytesLike, solidityPackedKeccak256 } from "ethers";
import { State } from "@stackr/sdk/machine";

interface Obstacle {
  lane: number; // Lane the obstacle is in (0 or 1)
  z: number; // Distance from the car
}

interface Game {
  gameId: string;
  owner: string; // Player's address
  carPosition: number; // 0 or 1 representing lanes
  speed: number; // Speed of the car
  score: number;
  obstacle: Obstacle; // Array representing obstacle objects
  isGameOver: boolean;
  startedAt: number;
  endedAt: number | null;
}

export interface AppState {
  games: Record<string, Game>;
}

// Initial state of the application
export const initialState: AppState = {
  games: {},
};

// TrafficRunState class extends the State class from @stackr/sdk
export class TrafficRunState extends State<AppState> {
  constructor(state: AppState) {
    super(state);
  }

  // Generate a root hash of the current state for verification
  getRootHash(): BytesLike {
    return solidityPackedKeccak256(
      ["string"],
      [JSON.stringify(this.state.games)]
    );
  }
}
