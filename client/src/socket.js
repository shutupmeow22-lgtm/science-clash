import { io } from 'socket.io-client';

// In production: same origin (server serves the React build)
// In dev: Vite proxies /socket.io â localhost:3001
const SERVER_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;

const socket = io(SERVER_URL, {
  autoConnect: false,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  path: '/socket.io',
});

export default socket;
