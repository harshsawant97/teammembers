import http from 'http';
import { Server } from 'socket.io';
import app from './app';

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

export const io = new Server(server, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  console.log('Frontend Dashboard Connected:', socket.id);

  socket.on('join_session', (sessionId) => {
    socket.join(sessionId);
    console.log(`Socket ${socket.id} joined session ${sessionId}`);
  });
});

server.listen(PORT, () => {
  console.log(`Backend API running on http://localhost:${PORT}`);
});
