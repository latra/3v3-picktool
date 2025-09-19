"use client";

import { useState } from "react";
import { useWebSocket } from "../hooks/useWebSocket";
import { config } from "../lib/config";
import { CreateMessage, MessageTypes, IncomingMessage } from "../types/messages";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy } from "@fortawesome/free-solid-svg-icons";


export default function Home() {
  const [blueTeamName, setBlueTeamName] = useState("Blue team");
  const [redTeamName, setRedTeamName] = useState("Red team");
  const [timeForPick, setTimeForPick] = useState(30);
  const [timeForBan, setTimeForBan] = useState(15);
  const [blueTeamBans, setBlueTeamBans] = useState(true);
  const [redTeamBans, setRedTeamBans] = useState(true);

  const [roomCreated, setRoomCreated] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [redTeamUrl, setRedTeamUrl] = useState("");
  const [blueTeamUrl, setBlueTeamUrl] = useState("");
  const [spectatorUrl, setSpectatorUrl] = useState("");
  // WebSocket connection
  const { connectionStatus, sendMessage } = useWebSocket(config.websocketUrl, {
    onMessage: (event) => {
      try {
        const message: IncomingMessage = JSON.parse(event.data);
        console.log('WebSocket message received:', message);
        
        // Handle different message types
        switch (message.type) {
          case MessageTypes.CREATE_RESPONSE:
            if ('room_id' in message) {
              console.log('Room created:', message.room_id);
              setRoomId(message.room_id);
              setRedTeamUrl( config.websiteUrl + "/draft?game_id=" + message.room_id + "&key=" + message.red_team_key + "&team=red");
              setBlueTeamUrl( config.websiteUrl + "/draft?game_id=" + message.room_id + "&key=" + message.blue_team_key + "&team=blue");
              setSpectatorUrl( config.websiteUrl + "/draft?game_id=" + message.room_id);
              setRoomCreated(true);
              // Handle room creation response
            }
            break;
          case MessageTypes.STATUS:
            if ('current_phase' in message) {
              console.log('Status update:', message);
              // Handle status updates
            }
            break;
          case MessageTypes.USER_JOINED:
            if ('message' in message) {
              console.log('User joined:', message.message);
              // Handle user joined notifications
            }
            break;
          default:
            console.log('Unknown message type:', message);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    },
    onOpen: (event) => {
      console.log('WebSocket connected');
    },
    onClose: (event) => {
      console.log('WebSocket disconnected');
    },
    onError: (event) => {
      console.error('WebSocket error:', event);
    }
  });

  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const createMessage: CreateMessage = {
      type: MessageTypes.CREATE,
      blue_team_name: blueTeamName,
      red_team_name: redTeamName,
      blue_team_has_bans: blueTeamBans,
      red_team_has_bans: redTeamBans,
      time_per_pick: timeForPick,
      time_per_ban: timeForBan
    };
    
    console.log('Creating draft room with config:', createMessage);
    
    // Send configuration via WebSocket
    if (connectionStatus === 'connected') {
      sendMessage(createMessage);
    } else {
      console.warn('WebSocket not connected. Cannot create draft room.');
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Connection Error';
      default: return 'Disconnected';
    }
  };

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <div className="flex flex-col items-center gap-3">
        <img src="/W2A Logo blanco sin fondo.svg" alt="W2A" className="h-10 opacity-95" />
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#0080ff] to-[#ff7430] drop-shadow-[0_2px_10px_rgba(0,128,255,0.25)]">3v3 STAFF</h1>
        <div className={`text-sm font-medium ${getConnectionStatusColor()}`}>
          {getConnectionStatusText() === 'Connected' ? 'Si ves esto, no lo hemos roto... aún' : 'Mierda, se rompió el cacharro.'}
        </div>
      </div>

    {!roomCreated &&    
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-8 w2a-card max-w-md w-full">
        <input 
          type="text" 
          placeholder="Blue team name"
          value={blueTeamName}
          onChange={(e) => setBlueTeamName(e.target.value)}
          className="px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[--w2a-primary] transition-all bg-[#0f162b] border border-white/10"
        />
        <input 
          type="text" 
          placeholder="Red team name"
          value={redTeamName}
          onChange={(e) => setRedTeamName(e.target.value)}
          className="px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[--w2a-primary] transition-all bg-[#0f162b] border border-white/10"
        />
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <label htmlFor="time-for-pick" className="w2a-text-muted">Time for pick (seconds)</label>
          <input 
            type="number" 
            id="time-for-pick"
            placeholder="Time for pick"
            value={timeForPick}
            onChange={(e) => setTimeForPick(Number(e.target.value))}
            className="px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[--w2a-primary] transition-all bg-[#0f162b] border border-white/10"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="time-for-ban" className="w2a-text-muted">Time for ban (seconds)</label>
          <input 
            type="number" 
            id="time-for-ban"
            placeholder="Time for ban"
            value={timeForBan}
            onChange={(e) => setTimeForBan(Number(e.target.value))}
            className="px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[--w2a-primary] transition-all bg-[#0f162b] border border-white/10"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input 
          type="checkbox" 
          id="blue-bans"
          checked={blueTeamBans}
          onChange={(e) => setBlueTeamBans(e.target.checked)}
          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="blue-bans" className="w2a-text-muted">Blue team has bans</label>
      </div>
      <div className="flex items-center gap-2">
        <input 
          type="checkbox" 
          id="red-bans"
          checked={redTeamBans}
          onChange={(e) => setRedTeamBans(e.target.checked)}
          className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
        />
        <label htmlFor="red-bans" className="w2a-text-muted">Red team has bans</label>
      </div>
      <button 
        type="submit"
        disabled={connectionStatus !== 'connected'}
        className={`py-2 px-6 rounded-md transition-all font-medium shadow-md ${
          connectionStatus === 'connected' 
            ? 'bg-gradient-to-r from-[#0080ff] to-[#ff7430] text-white hover:brightness-110' 
            : 'bg-gray-400 text-gray-200 cursor-not-allowed'
        }`}
      >
        {connectionStatus === 'connected' ? 'Start Draft' : 'Waiting for Connection...'}
      </button>
    </form>}
    {roomCreated && (
      <div className="flex flex-col gap-8 w-full max-w-2xl animate-in fade-in duration-700 slide-in-from-bottom-4 ">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-white mb-2">Draft Room Created!</h2>
          <p className="text-gray-300">Share these URLs with your teams and spectators</p>
          <button 
            className="mt-6 w-full py-4 px-6 rounded-xl transition-all duration-300 font-semibold shadow-lg bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 text-white hover:from-slate-700 hover:via-slate-800 hover:to-slate-900 hover:shadow-xl hover:shadow-slate-500/25 transform hover:scale-[1.02] active:scale-[0.98] border border-slate-500/20" 
            onClick={() => {
              navigator.clipboard.writeText("Blue: " + blueTeamUrl + "\n" + "Red: " + redTeamUrl + "\n" + "Spectator: " + spectatorUrl);
            }}
          >
            📋 Copy All URLs
          </button>
          
        </div>
        
        <div className="flex flex-col gap-6 w-full">
          <div className="flex flex-col gap-4 w-full p-6 bg-gradient-to-br from-blue-50/10 to-blue-100/5 border border-blue-500/20 rounded-xl backdrop-blur-sm transition-all duration-500 hover:border-blue-400/40 hover:shadow-lg hover:shadow-blue-500/10">
            <label htmlFor="blue-team-key" className="text-blue-200 font-semibold text-lg">Blue Team URL</label>
            <div className="flex gap-3 items-center">
              <input 
                type="text" 
                placeholder="Blue team key" 
                value={blueTeamUrl} 
                disabled 
                className="flex-1 px-5 py-3 border border-blue-300/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-300 bg-white/10 text-white placeholder-gray-400 backdrop-blur-sm" 
              />
              <button 
                className="px-4 py-3 rounded-lg transition-all duration-300 font-semibold shadow-lg bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 text-white hover:from-blue-600 hover:via-blue-700 hover:to-blue-800 hover:shadow-xl hover:shadow-blue-500/25 transform hover:scale-[1.05] active:scale-[0.95] flex items-center justify-center" 
                onClick={() => navigator.clipboard.writeText(blueTeamUrl)}
                title="Copy Blue Team URL"
              >
                <FontAwesomeIcon icon={faCopy} className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex flex-col gap-4 w-full p-6 bg-gradient-to-br from-red-50/10 to-red-100/5 border border-red-500/20 rounded-xl backdrop-blur-sm transition-all duration-500 hover:border-red-400/40 hover:shadow-lg hover:shadow-red-500/10">
            <label htmlFor="red-team-key" className="text-red-200 font-semibold text-lg">Red Team URL</label>
            <div className="flex gap-3 items-center">
              <input 
                type="text" 
                placeholder="Red team key" 
                value={redTeamUrl} 
                disabled 
                className="flex-1 px-5 py-3 border border-red-300/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 transition-all duration-300 bg-white/10 text-white placeholder-gray-400 backdrop-blur-sm" 
              />
              <button 
                className="px-4 py-3 rounded-lg transition-all duration-300 font-semibold shadow-lg bg-gradient-to-r from-red-500 via-red-600 to-red-700 text-white hover:from-red-600 hover:via-red-700 hover:to-red-800 hover:shadow-xl hover:shadow-red-500/25 transform hover:scale-[1.05] active:scale-[0.95] flex items-center justify-center" 
                onClick={() => navigator.clipboard.writeText(redTeamUrl)}
                title="Copy Red Team URL"
              >
                <FontAwesomeIcon icon={faCopy} className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex flex-col gap-4 w-full p-6 bg-gradient-to-br from-purple-50/10 to-purple-100/5 border border-purple-500/20 rounded-xl backdrop-blur-sm transition-all duration-500 hover:border-purple-400/40 hover:shadow-lg hover:shadow-purple-500/10">
            <label htmlFor="spectator-url" className="text-purple-200 font-semibold text-lg">Spectator URL</label>
            <div className="flex gap-3 items-center">
              <input 
                type="text" 
                placeholder="Spectator URL" 
                value={spectatorUrl} 
                disabled 
                className="flex-1 px-5 py-3 border border-purple-300/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all duration-300 bg-white/10 text-white placeholder-gray-400 backdrop-blur-sm" 
              />
              <button 
                className="px-4 py-3 rounded-lg transition-all duration-300 font-semibold shadow-lg bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 text-white hover:from-purple-600 hover:via-purple-700 hover:to-purple-800 hover:shadow-xl hover:shadow-purple-500/25 transform hover:scale-[1.05] active:scale-[0.95] flex items-center justify-center" 
                onClick={() => navigator.clipboard.writeText(spectatorUrl)}
                title="Copy Spectator URL"
              >
                <FontAwesomeIcon icon={faCopy} className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-4 mt-6 pt-6 border-t border-gray-600/30">

          <button 
            className="w-full py-4 px-6 rounded-xl transition-all duration-300 font-semibold shadow-lg bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 text-white hover:from-emerald-600 hover:via-emerald-700 hover:to-emerald-800 hover:shadow-xl hover:shadow-emerald-500/25 transform hover:scale-[1.02] active:scale-[0.98] border border-emerald-400/20"
            onClick={() => setRoomCreated(false)}
          >
            ✨ Create New Draft
          </button>
        </div>
      </div>
    )}
    
    {/* Footer */}
    <footer className="mt-16 pt-8 border-t border-gray-600/30 text-center text-gray-400 text-sm">
      <p>
        Developed by <span className="text-white font-medium">Latra</span> for{" "}
        <span className="text-white font-medium">W2A</span> |{" "}
        <a 
          href="https://github.com/latra/3v3-picktool" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 transition-colors duration-200 underline hover:no-underline"
        >
          GitHub Repository
        </a>
      </p>
    </footer>
  </div>
  );
}
