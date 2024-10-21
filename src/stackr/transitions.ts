// src/stackr/transitions.ts

import { Transitions, SolidityType } from "@stackr/sdk/machine";
import { TrafficRunState, AppState } from "./state";
import { hashMessage } from "ethers";

interface Obstacle {
  lane: number; // The lane (0, 1)
  z: number; // The distance (or position on the track)
}

// Define the createGame transition
const createGame = TrafficRunState.STF({
  schema: {
    owner: SolidityType.ADDRESS,
    initialSpeed: SolidityType.UINT,
    startedAt: SolidityType.UINT,
  },
  handler: ({ state, inputs, msgSender, block, emit }) => {
    const { owner, initialSpeed, startedAt } = inputs;

    // Ensure that msgSender matches inputs.owner
    if (msgSender.toLowerCase() !== owner.toLowerCase()) {
      emit({
        name: "InvalidSigner",
        value: `${msgSender} is not authorized to create a game.`,
      });
      return state;
    }

    // Generate a unique game ID
    const gameId = hashMessage(
      `${msgSender}::${block.timestamp}::${Object.keys(state.games).length}`
    );

    // Initialize the new game
    state.games[gameId] = {
      gameId,
      owner: owner,
      carPosition: 1, // Start in the middle lane (0, 1, 2)
      speed: initialSpeed,
      score: -1,
      obstacle: generateObstacles(block.timestamp),
      isGameOver: false,
      startedAt: startedAt,
      endedAt: null,
    };

    // Emit an event for game creation
    emit({
      name: "GameCreated",
      value: gameId,
    });

    return state;
  },
});

// Define the userMove transition
const userMove = TrafficRunState.STF({
  schema: {
    gameId: SolidityType.STRING,
    actionType: SolidityType.STRING, // New field to specify the action
    timestamp: SolidityType.UINT,
  },
  handler: ({ state, inputs, msgSender, block, emit }) => {
    const { gameId, actionType, timestamp } = inputs;
    const game = state.games[gameId];

    if (!game) {
      emit({
        name: "GameNotFound",
        value: `Game ID ${gameId} does not exist.`,
      });
      return state;
    }

    // Validate ownership
    if (game.owner.toLowerCase() !== msgSender.toLowerCase()) {
      emit({
        name: "UnauthorizedAction",
        value: `${msgSender} is not authorized to perform actions in game ${gameId}.`,
      });
      return state;
    }

    switch (actionType) {
      case "moveLeft":
        if (game.carPosition === 1) {
          game.carPosition = 0;
          emit({
            name: "CarMovedLeft",
            value: game.carPosition,
          });
        }
        break;

      case "moveRight":
        if (game.carPosition === 0) {
          game.carPosition = 1;
          emit({
            name: "CarMovedRight",
            value: game.carPosition,
          });
        }
        break;

      default:
        emit({
          name: "InvalidAction",
          value: `Game ${gameId}: Invalid action type ${actionType}.`,
        });
        break;
    }

    return state;
  },
});

const generateObstacleAndScoreUpdate = TrafficRunState.STF({
  schema: {
    gameId: SolidityType.STRING,
    timestamp: SolidityType.UINT,
  },
  handler: ({ state, inputs, msgSender, block, emit }) => {
    const { gameId, timestamp } = inputs;
    const game = state.games[gameId];

    if (!game) {
      emit({
        name: "GameNotFound",
        value: `Game ID ${gameId} does not exist.`,
      });
      return state;
    }

    // Validate ownership
    if (game.owner.toLowerCase() !== msgSender.toLowerCase()) {
      emit({
        name: "UnauthorizedAction",
        value: `${msgSender} is not authorized to update the game ${gameId}.`,
      });
      return state;
    }

    game.obstacle = generateObstacles(timestamp);

    emit({
      name: "ObstacleGenerated",
      value: `New obstacle generated in lane ${timestamp % 2}`,
    });

    // Only update the score, no obstacle movement or collision checks
    game.score += game.speed; // Increment score based on game speed
    emit({
      name: "ScoreUpdated",
      value: `Game ${gameId}: Score is now ${game.score}.`,
    });

    return state;
  },
});

const gameOver = TrafficRunState.STF({
  schema: {
    gameId: SolidityType.STRING,
    over: SolidityType.BOOL, // Boolean to indicate if the game is over
    timestamp: SolidityType.UINT, // Optional, used to record when the game ended
  },
  handler: ({ state, inputs, msgSender, emit }) => {
    const { gameId, over, timestamp } = inputs;
    const game = state.games[gameId];

    if (!game) {
      emit({
        name: "GameNotFound",
        value: `Game ID ${gameId} does not exist.`,
      });
      return state;
    }

    // Validate ownership
    if (game.owner.toLowerCase() !== msgSender.toLowerCase()) {
      emit({
        name: "UnauthorizedAction",
        value: `${msgSender} is not authorized to end game ${gameId}.`,
      });
      return state;
    }

    // Update game state to 'over'
    game.isGameOver = over;
    game.endedAt = timestamp; // Record the timestamp when the game is marked as over

    emit({
      name: "GameOver",
      value: `Game ${gameId} is now ${over ? "over" : "active"}.`,
    });

    return state;
  },
});

// Define the resetGame transition
const resetGame = TrafficRunState.STF({
  schema: {
    gameId: SolidityType.STRING,
    timestamp: SolidityType.UINT,
  },
  handler: ({ state, inputs, msgSender, block, emit }) => {
    const { gameId, timestamp } = inputs;
    const game = state.games[gameId];

    if (!game) {
      emit({
        name: "GameNotFound",
        value: `Game ID ${gameId} does not exist.`,
      });
      return state;
    }

    // Only the game owner can reset the game
    if (game.owner.toLowerCase() !== msgSender.toLowerCase()) {
      emit({
        name: "UnauthorizedReset",
        value: `${msgSender} is not authorized to reset the game ${gameId}.`,
      });
      return state;
    }

    // Reset the game state
    state.games[gameId] = {
      ...game,
      carPosition: 1,
      speed: 1,
      score: 0,
      obstacle: generateObstacles(block.timestamp),
      isGameOver: false,
      endedAt: null,
    };

    emit({
      name: "GameReset",
      value: `Game ${gameId} has been reset.`,
    });

    return state;
  },
});

// Export the transitions
export const transitions: Transitions<TrafficRunState> = {
  createGame,
  userMove,
  resetGame,
  gameOver,
  generateObstacleAndScoreUpdate,
};

// Helper function to generate obstacles
function generateObstacles(timestamp: number): Obstacle {
  // Obstacles are represented by lane positions (0, 1)
  return { lane: timestamp % 2, z: -70 };
}
