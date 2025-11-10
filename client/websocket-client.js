class WebSocketClient {
  constructor() {
      this.socket = null;
      this.isConnected = false;
      this.currentRoom = 'lobby';
      this.userId = this.generateUserId();
      this.userName = `User${Math.floor(Math.random() * 1000)}`;
      this.userColor = this.generateRandomColor();
      
      this.drawingCanvas = null;
      this.onUsersUpdate = null;
      this.onCursorUpdate = null;
  }

  generateUserId() {
      return 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  generateRandomColor() {
      const colors = ['#ff6b6b', '#4ecdc4', '#9b5de5', '#00bbf9', '#f15bb5', '#fee440'];
      return colors[Math.floor(Math.random() * colors.length)];
  }

  connect() {
      this.socket = io();
      
      this.socket.on('connect', () => {
          console.log('Connected to server');
          this.isConnected = true;
          this.updateConnectionStatus(true);
          this.joinRoom(this.currentRoom);
      });

      this.socket.on('disconnect', () => {
          console.log('Disconnected from server');
          this.isConnected = false;
          this.updateConnectionStatus(false);
      });

      this.socket.on('room-joined', (data) => {
          console.log('Joined room:', data.room);
          this.currentRoom = data.room;
          this.updateRoomDisplay(data.room);
          this.updateUsersList(data.users);
      });

      this.socket.on('user-joined', (data) => {
          console.log('User joined:', data.user);
          this.updateUsersList(data.users);
      });

      this.socket.on('user-left', (data) => {
          console.log('User left:', data.userId);
          this.updateUsersList(data.users);
          this.removeUserCursor(data.userId);
      });

      this.socket.on('drawing-data', (data) => {
          this.handleDrawingData(data);
      });

      this.socket.on('cursor-move', (data) => {
          if (this.onCursorUpdate && data.userId !== this.userId) {
              this.onCursorUpdate(data);
          }
      });

      this.socket.on('canvas-state', (data) => {
          if (this.drawingCanvas) {
              this.drawingCanvas.loadCanvasState(data.canvasData);
          }
      });

      this.socket.on('undo-redo', (data) => {
          if (data.userId !== this.userId && this.drawingCanvas) {
              if (data.action === 'undo') {
                  this.drawingCanvas.undo();
              } else if (data.action === 'redo') {
                  this.drawingCanvas.redo();
              }
          }
      });

      this.socket.on('canvas-cleared', (data) => {
          if (data.userId !== this.userId && this.drawingCanvas) {
              this.drawingCanvas.clearCanvas();
          }
      });
  }

  updateConnectionStatus(connected) {
      const statusDot = document.getElementById('statusDot');
      const statusText = document.getElementById('connectionStatus');
      
      if (statusDot) {
          statusDot.classList.toggle('connected', connected);
      }
      
      if (statusText) {
          statusText.textContent = connected ? 'Connected to server' : 'Disconnected';
      }
  }

  updateRoomDisplay(roomName) {
      const roomElement = document.getElementById('currentRoom');
      if (roomElement) {
          roomElement.textContent = roomName;
      }
  }

  joinRoom(roomName) {
      if (this.socket && roomName) {
          this.socket.emit('join-room', {
              room: roomName,
              user: {
                  id: this.userId,
                  name: this.userName,
                  color: this.userColor
              }
          });
          this.currentRoom = roomName;
      }
  }

  sendDrawingData(drawingEvent) {
      if (this.socket && this.isConnected) {
          this.socket.emit('drawing', {
              ...drawingEvent,
              room: this.currentRoom,
              userId: this.userId
          });
      }
  }

  sendCursorPosition(x, y) {
      if (this.socket && this.isConnected) {
          this.socket.emit('cursor-move', {
              x,
              y,
              room: this.currentRoom,
              userId: this.userId,
              userName: this.userName,
              userColor: this.userColor
          });
      }
  }

  sendUndo() {
      if (this.socket && this.isConnected) {
          this.socket.emit('undo', {
              room: this.currentRoom,
              userId: this.userId
          });
      }
  }

  sendRedo() {
      if (this.socket && this.isConnected) {
          this.socket.emit('redo', {
              room: this.currentRoom,
              userId: this.userId
          });
      }
  }

  sendClearCanvas() {
      if (this.socket && this.isConnected) {
          this.socket.emit('clear-canvas', {
              room: this.currentRoom,
              userId: this.userId
          });
      }
  }

  handleDrawingData(data) {
      if (!this.drawingCanvas || data.userId === this.userId) return;

      switch (data.type) {
          case 'start':
              this.pendingStroke = {
                  tool: data.tool,
                  color: data.tool === 'eraser' ? '#FFFFFF' : data.color,
                  size: data.size,
                  points: [{x: data.x, y: data.y}]
              };
              break;
              
          case 'draw':
              if (this.pendingStroke) {
                  this.pendingStroke.points.push({x: data.x, y: data.y});
                  // Draw intermediate points for smoother rendering
                  if (this.pendingStroke.points.length % 3 === 0) {
                      this.drawingCanvas.drawExternalStroke(this.pendingStroke);
                  }
              }
              break;
              
          case 'end':
              if (this.pendingStroke) {
                  this.drawingCanvas.drawExternalStroke(this.pendingStroke);
                  this.pendingStroke = null;
              }
              break;
      }
  }

  updateUsersList(users) {
      if (this.onUsersUpdate) {
          this.onUsersUpdate(users);
      }
  }

  removeUserCursor(userId) {
      const cursor = document.querySelector(`[data-user-id="${userId}"]`);
      if (cursor) {
          cursor.remove();
      }
  }

  setDrawingCanvas(canvas) {
      this.drawingCanvas = canvas;
  }

  setUserCallbacks(onUsersUpdate, onCursorUpdate) {
      this.onUsersUpdate = onUsersUpdate;
      this.onCursorUpdate = onCursorUpdate;
  }
}