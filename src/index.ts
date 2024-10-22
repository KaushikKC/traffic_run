// src/index.ts

import express, { Request, Response } from "express";
import { mru } from "./stackr/mru";
import { ActionConfirmationStatus } from "@stackr/sdk";
import dotenv from "dotenv";
import path from "path";
import { machine } from "./stackr/machine";
import { Playground } from "@stackr/sdk/plugins";
import cors from "cors";

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3012;

app.use(
  cors({
    origin: "https://traffic-run-client.vercel.app", // Allow only your frontend origin
    methods: "GET, POST, PUT, DELETE, OPTIONS",
    allowedHeaders: "Content-Type, Authorization, x-msg-sender,x-signature", // Allow 'x-msg-sender'
  })
);

mru
  .init()
  .then(() => {
    console.log("Micro Rollup Initialized");
  })
  .catch((error) => {
    console.error("Error initializing MRU:", error);
  });

// Middleware to parse JSON bodies
app.use(express.json());
Playground.init(mru);

// Enable CORS for all routes
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// Initialize the Micro Rollup

// API Endpoints

app.get("/", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "public", "traffic_run.html"));
});

/**
 * POST /createGame
 * Creates a new Traffic Run game.
 * Body Parameters:
 * - owner: string (Player's address)
 * - initialSpeed: number (1-5)
 * - startedAt: number (timestamp)
 * Headers:
 * - x-msg-sender: string (Player's address)
 * - x-signature: string (Signature for authentication)
 */
app.post("/createGame", async (req: Request, res: Response) => {
  const { owner, initialSpeed, startedAt } = req.body;
  const msgSender = req.headers["x-msg-sender"] as string;
  const signature = req.headers["x-signature"] as string;

  try {
    const actionParams = {
      name: "createGame",
      inputs: { owner, initialSpeed, startedAt },
      signature,
      msgSender,
    };

    // Submit the action to the Micro Rollup
    const ack = await mru.submitAction(actionParams);

    // Wait for the action to be confirmed (C1 status)
    const { errors, logs } = await ack.waitFor(ActionConfirmationStatus.C1);

    if (errors?.length) {
      console.error("Action errors:", errors);
      return res.status(400).json({ error: errors[0].message });
    }

    // Ensure logs are present
    if (!logs || logs.length === 0) {
      return res.status(500).json({ error: "No logs returned from action." });
    }

    // Extract the gameId from the logs
    const gameCreatedLog = logs.find((log) => log.name === "GameCreated");
    const gameId = gameCreatedLog ? gameCreatedLog.value : null;

    if (!gameId) {
      return res.status(500).json({ error: "Game ID not found in logs." });
    }

    res.status(201).json({ gameId });
  } catch (error: any) {
    console.error("Error creating game:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * POST /moveCar
 * Performs an action on the car (moveLeft, moveRight, accelerate, decelerate).
 * Body Parameters:
 * - gameId: string
 * - actionType: string (either "moveLeft", "moveRight", "accelerate", "decelerate")
 * Headers:
 * - x-msg-sender: string (Player's address)
 * - x-signature: string (Signature for authentication)
 */
app.post("/moveCar", async (req: Request, res: Response) => {
  const { gameId, actionType, timestamp } = req.body;
  const msgSender = req.headers["x-msg-sender"] as string;
  const signature = req.headers["x-signature"] as string;

  try {
    const actionParams = {
      name: "userMove", // This dynamically sets the action name
      inputs: { gameId, actionType, timestamp },
      signature,
      msgSender,
    };

    // Submit the action to the Micro Rollup
    const ack = await mru.submitAction(actionParams);

    // Wait for confirmation
    const { errors, logs } = await ack.waitFor(ActionConfirmationStatus.C1);

    if (errors?.length) {
      console.error("Action errors:", errors);
      return res.status(400).json({ error: errors[0].message });
    }

    let successMessage = "";
    switch (actionType) {
      case "moveLeft":
        successMessage = "Moved left successfully.";
        break;
      case "moveRight":
        successMessage = "Moved right successfully.";
        break;
      default:
        successMessage = "Action performed successfully.";
    }

    res.status(200).json({ message: successMessage });
  } catch (error: any) {
    console.error("Error performing action:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * POST /resetGame
 * Resets the specified game to its initial state.
 * Body Parameters:
 * - gameId: string
 * Headers:
 * - x-msg-sender: string (Player's address)
 * - x-signature: string (Signature for authentication)
 */
app.post("/resetGame", async (req: Request, res: Response) => {
  const { gameId, timestamp } = req.body;
  const msgSender = req.headers["x-msg-sender"] as string;
  const signature = req.headers["x-signature"] as string;

  try {
    const actionParams = {
      name: "resetGame",
      inputs: { gameId, timestamp },
      signature,
      msgSender,
    };

    // Submit the action
    const ack = await mru.submitAction(actionParams);

    // Wait for confirmation
    const { errors, logs } = await ack.waitFor(ActionConfirmationStatus.C1);

    if (errors?.length) {
      console.error("Action errors:", errors);
      return res.status(400).json({ error: errors[0].message });
    }

    res.status(200).json({ message: "Game reset successfully." });
  } catch (error: any) {
    console.error("Error resetting game:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/generateObstacle", async (req: Request, res: Response) => {
  const { gameId, timestamp } = req.body;
  const msgSender = req.headers["x-msg-sender"] as string;
  const signature = req.headers["x-signature"] as string;

  try {
    const actionParams = {
      name: "generateObstacleAndScoreUpdate", // The action for generating obstacles and updating score
      inputs: { gameId, timestamp },
      signature,
      msgSender,
    };

    // Submit the action to the Micro Rollup
    const ack = await mru.submitAction(actionParams);

    // Wait for confirmation
    const { errors, logs } = await ack.waitFor(ActionConfirmationStatus.C1);

    if (errors?.length) {
      console.error("Action errors:", errors);
      return res.status(400).json({ error: errors[0].message });
    }

    res
      .status(200)
      .json({ message: "Obstacle generated and score updated successfully." });
  } catch (error: any) {
    console.error("Error generating obstacle:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/gameOver", async (req: Request, res: Response) => {
  const { gameId, over, timestamp } = req.body;
  const msgSender = req.headers["x-msg-sender"] as string;
  const signature = req.headers["x-signature"] as string;

  try {
    const actionParams = {
      name: "gameOver", // Action name for marking the game as over
      inputs: { gameId, over, timestamp },
      signature,
      msgSender,
    };

    // Submit the action to the Micro Rollup
    const ack = await mru.submitAction(actionParams);

    // Wait for confirmation
    const { errors, logs } = await ack.waitFor(ActionConfirmationStatus.C1);

    if (errors?.length) {
      console.error("Action errors:", errors);
      return res.status(400).json({ error: errors[0].message });
    }

    res
      .status(200)
      .json({ message: `Game ${gameId} is now ${over ? "over" : "active"}.` });
  } catch (error: any) {
    console.error("Error ending game:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * GET /game/:gameId
 * Retrieves the current state of the specified game.
 */
app.get("/game/:gameId", (req: Request, res: Response) => {
  const { gameId } = req.params;
  const { games } = machine.state;

  // Access the current state directly from mru.state
  const game = games[gameId];

  if (!game) {
    return res.status(404).json({ message: "Game not found." });
  }

  res.json(game);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Traffic Run game server running at http://localhost:${PORT}`);
});
