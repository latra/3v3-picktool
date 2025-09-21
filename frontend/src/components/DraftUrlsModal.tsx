"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy, faTimes } from "@fortawesome/free-solid-svg-icons";

interface DraftUrlsModalProps {
  isOpen: boolean;
  onClose: () => void;
  blueTeamUrl: string;
  redTeamUrl: string;
  spectatorUrl: string;
  isFearless: boolean;
  title?: string;
  subtitle?: string;
}

export default function DraftUrlsModal({
  isOpen,
  onClose,
  blueTeamUrl,
  redTeamUrl,
  spectatorUrl,
  isFearless,
  title = "Draft Room Created!",
  subtitle = "Share these URLs with your teams and spectators"
}: DraftUrlsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in duration-300 slide-in-from-bottom-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="text-center flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
            <p className="text-gray-300">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 -mt-2 -mr-2"
          >
            <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
          </button>
        </div>

        {/* Copy All Button */}
        <button 
          className="w-full py-4 px-6 rounded-xl transition-all duration-300 font-semibold shadow-lg bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 text-white hover:from-slate-700 hover:via-slate-800 hover:to-slate-900 hover:shadow-xl hover:shadow-slate-500/25 transform hover:scale-[1.02] active:scale-[0.98] border border-slate-500/20 mb-6" 
          onClick={() => {
            const blueUrlWithFearless = blueTeamUrl + (isFearless ? "&fearless=true" : "");
            const redUrlWithFearless = redTeamUrl + (isFearless ? "&fearless=true" : "");
            navigator.clipboard.writeText("Blue: " + blueUrlWithFearless + "\n" + "Red: " + redUrlWithFearless + "\n" + "Spectator: " + spectatorUrl);
          }}
        >
          📋 Copy All URLs
        </button>
        
        {/* URL Inputs */}
        <div className="flex flex-col gap-6 w-full">
          {/* Blue Team URL */}
          <div className="flex flex-col gap-4 w-full p-6 bg-gradient-to-br from-blue-50/10 to-blue-100/5 border border-blue-500/20 rounded-xl backdrop-blur-sm transition-all duration-500 hover:border-blue-400/40 hover:shadow-lg hover:shadow-blue-500/10">
            <label htmlFor="blue-team-key" className="text-blue-200 font-semibold text-lg">Blue Team URL</label>
            <div className="flex gap-3 items-center">
              <input 
                type="text" 
                placeholder="Blue team key" 
                value={blueTeamUrl + (isFearless ? "&fearless=true" : "")} 
                disabled 
                className="flex-1 px-5 py-3 border border-blue-300/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-300 bg-white/10 text-white placeholder-gray-400 backdrop-blur-sm" 
              />
              <button 
                className="px-4 py-3 rounded-lg transition-all duration-300 font-semibold shadow-lg bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 text-white hover:from-blue-600 hover:via-blue-700 hover:to-blue-800 hover:shadow-xl hover:shadow-blue-500/25 transform hover:scale-[1.05] active:scale-[0.95] flex items-center justify-center" 
                onClick={() => navigator.clipboard.writeText(blueTeamUrl + (isFearless ? "&fearless=true" : ""))}
                title="Copy Blue Team URL"
              >
                <FontAwesomeIcon icon={faCopy} className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Red Team URL */}
          <div className="flex flex-col gap-4 w-full p-6 bg-gradient-to-br from-red-50/10 to-red-100/5 border border-red-500/20 rounded-xl backdrop-blur-sm transition-all duration-500 hover:border-red-400/40 hover:shadow-lg hover:shadow-red-500/10">
            <label htmlFor="red-team-key" className="text-red-200 font-semibold text-lg">Red Team URL</label>
            <div className="flex gap-3 items-center">
              <input 
                type="text" 
                placeholder="Red team key" 
                value={redTeamUrl + (isFearless ? "&fearless=true" : "")} 
                disabled 
                className="flex-1 px-5 py-3 border border-red-300/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 transition-all duration-300 bg-white/10 text-white placeholder-gray-400 backdrop-blur-sm" 
              />
              <button 
                className="px-4 py-3 rounded-lg transition-all duration-300 font-semibold shadow-lg bg-gradient-to-r from-red-500 via-red-600 to-red-700 text-white hover:from-red-600 hover:via-red-700 hover:to-red-800 hover:shadow-xl hover:shadow-red-500/25 transform hover:scale-[1.05] active:scale-[0.95] flex items-center justify-center" 
                onClick={() => navigator.clipboard.writeText(redTeamUrl + (isFearless ? "&fearless=true" : ""))}
                title="Copy Red Team URL"
              >
                <FontAwesomeIcon icon={faCopy} className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Spectator URL */}
          <div className="flex flex-col gap-4 w-full p-6 bg-gradient-to-br from-purple-50/10 to-purple-100/5 border border-purple-500/20 rounded-xl backdrop-blur-sm transition-all duration-500 hover:border-purple-400/40 hover:shadow-lg hover:shadow-purple-500/10">
            <label htmlFor="spectator-url" className="text-purple-200 font-semibold text-lg">Spectator URL</label>
            <div className="flex gap-3 items-center">
              <input 
                type="text" 
                placeholder="Spectator URL" 
                value={spectatorUrl + (isFearless ? "&fearless=true" : "")} 
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
      </div>
    </div>
  );
}
