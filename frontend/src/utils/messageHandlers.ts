import { 
  IncomingMessage, 
  CreateResponseMessage, 
  StatusMessage, 
  UserJoinedMessage,
  MessageTypes 
} from "../types/messages";

export const handleIncomingMessage = (message: IncomingMessage) => {
  switch (message.type) {
    case MessageTypes.CREATE_RESPONSE:
      return handleCreateResponse(message as CreateResponseMessage);
    case MessageTypes.STATUS:
      return handleStatusUpdate(message as StatusMessage);
    case MessageTypes.USER_JOINED:
      return handleUserJoined(message as UserJoinedMessage);
    default:
      console.log('Unknown message type:', message);
      return null;
  }
};

const handleCreateResponse = (message: CreateResponseMessage) => {
  console.log('Room created successfully:', {
    roomId: message.room_id,
    blueTeamKey: message.blue_team_key,
    redTeamKey: message.red_team_key
  });
  
  // You could store these keys in state or localStorage for later use
  return {
    type: 'ROOM_CREATED',
    payload: message
  };
};

const handleStatusUpdate = (message: StatusMessage) => {
  console.log('Game status update:', {
    phase: message.current_phase,
    timeRemaining: message.time_remaining,
    timerActive: message.timer_active,
    blueTeam: message.blue_team,
    redTeam: message.red_team
  });
  
  return {
    type: 'STATUS_UPDATE',
    payload: message
  };
};

const handleUserJoined = (message: UserJoinedMessage) => {
  console.log('User joined notification:', {
    message: message.message,
    team: message.team || 'spectator'
  });
  
  return {
    type: 'USER_JOINED',
    payload: message
  };
};
