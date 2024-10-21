// src/stackr/machine.ts

import { StateMachine } from "@stackr/sdk/machine";
import { TrafficRunState, initialState } from "./state";
import { transitions } from "./transitions";

// Define the State Machine for Traffic Run
const machine = new StateMachine({
  id: "traffic-run", // Unique identifier for this state machine
  stateClass: TrafficRunState, // The state class used by this machine
  initialState, // Initial state
  on: transitions, // Transitions that can be applied to the state
});

export { machine };
