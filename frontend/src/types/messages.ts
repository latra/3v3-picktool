// WebSocket Message Types
// These types match the Go server message definitions

export interface CreateMessage {
  type: string;
  blue_team_name: string;
  red_team_name: string;
  blue_team_has_bans: boolean;
  red_team_has_bans: boolean;
  time_per_pick: number;
  time_per_ban: number;
  fearless_bans: string[]
}

export interface CreateResponseMessage {
  type: string;
  room_id: string;
  red_team_key: string;
  blue_team_key: string;
}

export interface JoinMessage {
  type: string;
  room_id: string;
  key?: string;
}

export interface ActionMessage {
  type: string;
  action: "ready" | "champ_select" | "champ_pick";
  champion?: string;
}

export interface TeamMessage {
  name: string;
  bans: string[];
  picks: string[];
}

export interface StatusMessage {
  type: string;
  current_phase: typeof PossiblePhases[keyof typeof PossiblePhases];
  time_per_pick: number;
  time_per_ban: number;
  time_remaining: number; 
  fearless_bans: string[];
  timer_active: boolean;
  blue_team: Team;
  red_team: Team;
}

export interface UserJoinedMessage {
  type: string;
  message: string;
  team?: "blue" | "red" | ""; // empty string for spectator
}

// Additional types referenced in the messages
export interface Team {
  name: string;
  bans: string[];
  picks: string[];
}

// Union type for all possible incoming messages
export type IncomingMessage = 
  | CreateResponseMessage
  | StatusMessage
  | UserJoinedMessage;

// Union type for all possible outgoing messages
export type OutgoingMessage = 
  | CreateMessage
  | JoinMessage
  | ActionMessage;

// Message type constants for easier usage
export const MessageTypes = {
  CREATE: "create",
  CREATE_RESPONSE: "create_response",
  JOIN: "join",
  ACTION: "action",
  STATUS: "status",
  USER_JOINED: "user_joined",
} as const;

export const Status = {
  NOT_READY: "Not Ready",
  WAITING: "Pending",
  PICKING: "Picking",
  BANNING: "Banning",
  FINISHED: "Finished",
} as const;

export const PossiblePhases = {
  NO_READY: "NoReady",
  BLUE_READY: "BlueReady", 
  RED_READY: "RedReady",
  BAN_BLUE_1: "BanBlue1",
  BAN_RED_1: "BanRed1",
  BAN_BLUE_2: "BanBlue2",
  BAN_RED_2: "BanRed2",
  BAN_BLUE_3: "BanBlue3",
  BAN_RED_3: "BanRed3",
  PICK_BLUE_1: "PickBlue1",
  PICK_RED_1: "PickRed1",
  PICK_RED_2: "PickRed2",
  PICK_BLUE_2: "PickBlue2",
  BAN_RED_4: "BanRed4",
  BAN_BLUE_4: "BanBlue4",
  BAN_RED_5: "BanRed5",
  BAN_BLUE_5: "BanBlue5",
  PICK_BLUE_3: "PickBlue3",
  PICK_RED_3: "PickRed3",
  FINISHED: "Finished",
} as const;

// Type-safe phase type
export type GamePhase = typeof PossiblePhases[keyof typeof PossiblePhases];

// Helper functions to check phase types
export const PhaseHelpers = {
  isNotReadyPhase: (phase: GamePhase, team: 'blue' | 'red'): boolean => {
    const readyPhases = team === 'blue' ? [PossiblePhases.NO_READY, PossiblePhases.RED_READY] : [PossiblePhases.NO_READY, PossiblePhases.BLUE_READY];
    return (readyPhases as readonly GamePhase[]).includes(phase);
  },
  
  isBanPhase: (phase: GamePhase, team: 'blue' | 'red'): boolean => {
    const banPhases = team === 'blue' ? [
      PossiblePhases.BAN_BLUE_1, PossiblePhases.BAN_BLUE_2,
      PossiblePhases.BAN_BLUE_3, PossiblePhases.BAN_BLUE_4,
      PossiblePhases.BAN_BLUE_5
    ] : [
      PossiblePhases.BAN_RED_1, PossiblePhases.BAN_RED_2,
      PossiblePhases.BAN_RED_3, PossiblePhases.BAN_RED_4,
      PossiblePhases.BAN_RED_5
    ];
    return (banPhases as readonly GamePhase[]).includes(phase);
  },
  
  isPickPhase: (phase: GamePhase, team: 'blue' | 'red'): boolean => {
    const pickPhases = team === 'blue' ? [
      PossiblePhases.PICK_BLUE_1, PossiblePhases.PICK_BLUE_2,
      PossiblePhases.PICK_BLUE_3
    ] : [
      PossiblePhases.PICK_RED_1, PossiblePhases.PICK_RED_2,
      PossiblePhases.PICK_RED_3
    ];
    return (pickPhases as readonly GamePhase[]).includes(phase);
  },
  notTurn: (phase: GamePhase, team: 'blue' | 'red'): boolean => {
    const notTurnPhases = team === 'blue' ? [
      PossiblePhases.BLUE_READY, PossiblePhases.BAN_RED_1, PossiblePhases.BAN_RED_2, PossiblePhases.BAN_RED_3, PossiblePhases.BAN_RED_4, PossiblePhases.BAN_RED_5, PossiblePhases.PICK_RED_1, PossiblePhases.PICK_RED_2, PossiblePhases.PICK_RED_3
    ] : [
      PossiblePhases.RED_READY, PossiblePhases.BAN_BLUE_1, PossiblePhases.BAN_BLUE_2, PossiblePhases.BAN_BLUE_3, PossiblePhases.BAN_BLUE_4, PossiblePhases.BAN_BLUE_5, PossiblePhases.PICK_BLUE_1, PossiblePhases.PICK_BLUE_2, PossiblePhases.PICK_BLUE_3
    ];
    return (notTurnPhases as readonly GamePhase[]).includes(phase);
  },
};

export type MessageType = typeof MessageTypes[keyof typeof MessageTypes];
