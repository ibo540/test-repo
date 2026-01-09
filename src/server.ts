import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { SessionManager } from './services/SessionManager';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow any origin for local network testing (phone IP != localhost)
        methods: ["GET", "POST"]
    }
});

const PORT = 3000;
const sessionManager = new SessionManager(io);

app.use(express.static('public'));

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Delegate to SessionManager
    sessionManager.handleConnection(socket);

    socket.on('disconnect', () => {
        sessionManager.handleDisconnect(socket);
    });
});
