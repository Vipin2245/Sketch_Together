const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const RoomManager = require('./room-manager');

class CollaborativeCanvasServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        
        this.roomManager = new RoomManager();
        this.port = process.env.PORT || 3000;

        this.setupExpress();
        this.setupSocketIO();
    }

    setupExpress() {
        // Serve static files from client directory
        this.app.use(express.static(path.join(__dirname, '../client')));
        
        // Route for home page
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../client/index.html'));
        });

        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'ok', 
                rooms: this.roomManager.getRoomCount(),
                users: this.roomManager.getUserCount()
            });
        });
    }

    setupSocketIO() {
        this.io.on('connection', (socket) => {
            console.log('User connected:', socket.id);

            // Room management
            socket.on('join-room', (data) => {
                this.handleJoinRoom(socket, data);
            });

            // Drawing events
            socket.on('drawing', (data) => {
                this.handleDrawing(socket, data);
            });

            // Cursor movement
            socket.on('cursor-move', (data) => {
                this.handleCursorMove(socket, data);
            });

            // Undo/Redo events
            socket.on('undo', (data) => {
                this.handleUndoRedo(socket, data, 'undo');
            });

            socket.on('redo', (data) => {
                this.handleUndoRedo(socket, data, 'redo');
            });

            // Clear canvas
            socket.on('clear-canvas', (data) => {
                this.handleClearCanvas(socket, data);
            });

            // Disconnection
            socket.on('disconnect', () => {
                this.handleDisconnect(socket);
            });
        });
    }

    handleJoinRoom(socket, data) {
        const { room, user } = data;
        
        // Leave previous room if any
        if (socket.room) {
            socket.leave(socket.room);
            this.roomManager.removeUserFromRoom(socket.room, socket.id);
        }

        // Join new room
        socket.join(room);
        socket.room = room;
        socket.user = user;

        // Add user to room
        this.roomManager.addUserToRoom(room, socket.id, user);

        // Send current room state to the user
        const roomState = this.roomManager.getRoomState(room);
        socket.emit('room-joined', {
            room,
            users: roomState.users,
            canvasData: roomState.canvasData
        });

        // Notify other users in the room
        socket.to(room).emit('user-joined', {
            user,
            users: roomState.users
        });

        console.log(`User ${user.name} joined room ${room}`);
    }

    handleDrawing(socket, data) {
        const { room, userId } = data;
        
        if (socket.room === room) {
            // Broadcast drawing data to other users in the room
            socket.to(room).emit('drawing-data', data);
            
            // Update room's canvas state if this is the end of a stroke
            if (data.type === 'end') {
                this.roomManager.addDrawingToHistory(room, data);
            }
        }
    }

    handleCursorMove(socket, data) {
        const { room } = data;
        
        if (socket.room === room) {
            // Broadcast cursor position to other users in the room
            socket.to(room).emit('cursor-move', data);
        }
    }

    handleUndoRedo(socket, data, action) {
        const { room, userId } = data;
        
        if (socket.room === room) {
            // Broadcast undo/redo to other users
            socket.to(room).emit('undo-redo', {
                action,
                userId
            });
        }
    }

    handleClearCanvas(socket, data) {
        const { room, userId } = data;
        
        if (socket.room === room) {
            // Clear room's canvas state
            this.roomManager.clearRoomCanvas(room);
            
            // Broadcast clear to other users
            socket.to(room).emit('canvas-cleared', {
                userId
            });
        }
    }

    handleDisconnect(socket) {
        if (socket.room) {
            const room = socket.room;
            const userId = socket.id;
            
            // Remove user from room
            const updatedUsers = this.roomManager.removeUserFromRoom(room, userId);
            
            // Notify other users in the room
            socket.to(room).emit('user-left', {
                userId,
                users: updatedUsers
            });

            console.log(`User disconnected from room ${room}`);
        }
    }

    start() {
        this.server.listen(this.port, () => {
            console.log(`Collaborative Canvas Server running on port ${this.port}`);
            console.log(`Open http://localhost:${this.port} in your browser`);
        });
    }
}

// Start the server if this file is run directly
if (require.main === module) {
    const server = new CollaborativeCanvasServer();
    server.start();
}

module.exports = CollaborativeCanvasServer;