import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;

  const connectSocket = useCallback(() => {
    if (!user) return;

    const token = localStorage.getItem('token');
    const url = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    
    // Disconnect existing socket if any
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io(url, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionDelayGrowFactor: 1.5,
      randomizationFactor: 0.5,
      timeout: 20000,
      autoConnect: true,
    });
    
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      reconnectAttempts.current = 0;
      socket.emit('join', { propertyId: user.property, userId: user.id });
    });

    socket.on('disconnect', (reason) => {
      setConnected(false);
      // Log disconnect reason for debugging
      if (process.env.NODE_ENV !== 'production') {
        console.log('Socket disconnected:', reason);
      }
    });

    socket.on('connect_error', (error) => {
      reconnectAttempts.current += 1;
      if (process.env.NODE_ENV !== 'production') {
        console.error('Socket connection error:', error.message, `Attempt ${reconnectAttempts.current}/${maxReconnectAttempts}`);
      }
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.error('Max reconnection attempts reached. Please refresh the page.');
      }
    });

    socket.on('reconnect', (attemptNumber) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Socket reconnected after', attemptNumber, 'attempts');
      }
      // Re-join rooms after reconnection
      socket.emit('join', { propertyId: user.property, userId: user.id });
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Socket reconnection attempt:', attemptNumber);
      }
    });

    socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed after all attempts');
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    const cleanup = connectSocket();
    return cleanup;
  }, [connectSocket]);

  // Expose a manual reconnect function
  const reconnect = useCallback(() => {
    connectSocket();
  }, [connectSocket]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, reconnect }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
