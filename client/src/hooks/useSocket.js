import { useEffect } from 'react';
import { io } from 'socket.io-client';

// Singleton socket connection across components
let socketInstance = null;

export const getSocket = () => {
  if (!socketInstance) {
    socketInstance = io('http://localhost:5000', {
      withCredentials: true,
      autoConnect: true
    });
    
    socketInstance.on('connect', () => {
      console.log('Socket.IO Connected successfully.');
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Socket.IO Connection Error:', err.message);
    });
  }
  return socketInstance;
};

export default function useSocket(eventName, callback) {
  const socket = getSocket();

  useEffect(() => {
    if (!eventName || !callback) return;

    socket.on(eventName, callback);

    return () => {
      socket.off(eventName, callback);
    };
  }, [eventName, callback]);

  return socket;
}
