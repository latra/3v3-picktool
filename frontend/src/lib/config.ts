// WebSocket configuration
export const getWebSocketUrl = (): string => {
  // Check for environment variable first
  if (typeof window !== 'undefined') {
    // Client-side: check for runtime config or use default
    return process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8080/ws';
  }
  
  // Server-side: use default (this shouldn't be called on server for WebSocket)
  return 'ws://localhost:8080/ws';
};

export const getWebsiteUrl = (): string => {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_WEBSITE_URL || 'https://localhost:3000';
  }
  return 'https://localhost:3000';
};

export const config = {
  websocketUrl: getWebSocketUrl(),
  websiteUrl: getWebsiteUrl(),
} as const;
