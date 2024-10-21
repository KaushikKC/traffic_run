// src/stackr/mru.ts

import { MicroRollup } from "@stackr/sdk";
import { stackrConfig } from "../../stackr.config";
import { machine } from "./machine";

// Initialize and export the Micro Rollup instance
const mru = await MicroRollup({
  config: stackrConfig, // Stackr configuration
  stateMachines: [machine], // State machines used by the MRU
});

export { mru };
