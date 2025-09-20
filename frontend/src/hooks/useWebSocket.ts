"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface UseWebSocketOptions {
  onMessage?: (event: MessageEvent) => void;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface WebSocketState {
  socket: WebSocket | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  reconnectAttempt: number;
}

export const useWebSocket = (url: string, options: UseWebSocketOptions = {}) => {
  const {
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5
  } = options;

  const [state, setState] = useState<WebSocketState>({
    socket: null,
    connectionStatus: 'disconnected',
    reconnectAttempt: 0
  });

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const shouldReconnect = useRef(true);

  const connect = useCallback(() => {
    try {
      setState(prev => ({ ...prev, connectionStatus: 'connecting' }));
      
      const ws = new WebSocket(url);

      ws.onopen = (event) => {
        setState(prev => ({
          ...prev,
          socket: ws,
          connectionStatus: 'connected',
          reconnectAttempt: 0
        }));
        onOpen?.(event);
      };

      ws.onmessage = (event) => {
        onMessage?.(event);
      };

      ws.onclose = (event) => {
        setState(prev => ({ ...prev, connectionStatus: 'disconnected', socket: null }));
        onClose?.(event);

        // Attempt to reconnect if it wasn't a manual close
        if (shouldReconnect.current) {
          setState(prev => {
            if (prev.reconnectAttempt < maxReconnectAttempts) {
              reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
              return { ...prev, reconnectAttempt: prev.reconnectAttempt + 1 };
            }
            return prev;
          });
        }
      };

      ws.onerror = (event) => {
        setState(prev => ({ ...prev, connectionStatus: 'error' }));
        onError?.(event);
      };

    } catch (error) {
      setState(prev => ({ ...prev, connectionStatus: 'error' }));
      console.error('WebSocket connection failed:', error);
    }
  }, [url, onOpen, onMessage, onClose, onError, maxReconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    shouldReconnect.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (state.socket && state.socket.readyState === WebSocket.OPEN) {
      state.socket.close();
    }
  }, [state.socket]);

  const sendMessage = useCallback(<T = unknown>(message: string | T) => {
    if (state.socket && state.socket.readyState === WebSocket.OPEN) {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      state.socket.send(messageStr);
      return true;
    }
    return false;
  }, [state.socket]);

  useEffect(() => {
    shouldReconnect.current = true;
    connect();

    return () => {
      disconnect();
    };
  }, [url]);

  return {
    connectionStatus: state.connectionStatus,
    reconnectAttempt: state.reconnectAttempt,
    sendMessage,
    disconnect
  };
};
