class CollaborativeCanvasApp {
  constructor() {
      this.canvas = new DrawingCanvas(document.getElementById('drawingCanvas'));
      this.websocket = new WebSocketClient();
      
      this.initializeApp();
  }

  initializeApp() {
      // Set up WebSocket callbacks
      this.websocket.setDrawingCanvas(this.canvas);
      this.websocket.setUserCallbacks(
          (users) => this.updateUsersList(users),
          (cursorData) => this.updateUserCursor(cursorData)
      );

      // Connect to WebSocket server
      this.websocket.connect();

      // Set up UI event listeners
      this.setupToolButtons();
      this.setupColorButtons();
      this.setupBrushSizeSlider();
      this.setupActionButtons();
      this.setupRoomControls();

      // Set up drawing event listener
      this.canvas.canvas.addEventListener('drawing', (e) => {
          this.websocket.sendDrawingData(e.detail);
      });

      // Set up canvas cleared event
      this.canvas.canvas.addEventListener('canvasCleared', () => {
          this.websocket.sendClearCanvas();
      });

      // Set up cursor tracking
      this.setupCursorTracking();
  }

  setupToolButtons() {
      document.querySelectorAll('.tool-btn').forEach(btn => {
          btn.addEventListener('click', () => {
              document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
              this.canvas.setTool(btn.dataset.tool);
          });
      });
  }

  setupColorButtons() {
      document.querySelectorAll('.color-btn').forEach(btn => {
          btn.addEventListener('click', () => {
              document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
              this.canvas.setColor(btn.dataset.color);
              this.websocket.userColor = btn.dataset.color;
          });
      });
  }

  setupBrushSizeSlider() {
      const brushSizeSlider = document.getElementById('brushSize');
      const sizePreview = document.getElementById('sizePreview');

      brushSizeSlider.addEventListener('input', () => {
          const size = parseInt(brushSizeSlider.value);
          this.canvas.setBrushSize(size);
          sizePreview.style.width = size + 'px';
          sizePreview.style.height = size + 'px';
      });

      // Set initial size preview
      sizePreview.style.width = brushSizeSlider.value + 'px';
      sizePreview.style.height = brushSizeSlider.value + 'px';
  }

  setupActionButtons() {
      document.getElementById('undoBtn').addEventListener('click', () => {
          if (this.canvas.undo()) {
              this.websocket.sendUndo();
          }
      });

      document.getElementById('redoBtn').addEventListener('click', () => {
          if (this.canvas.redo()) {
              this.websocket.sendRedo();
          }
      });

      document.getElementById('clearBtn').addEventListener('click', () => {
          if (confirm('Are you sure you want to clear the canvas? This will erase everyone\'s drawings.')) {
              this.canvas.clearCanvas();
          }
      });
  }

  setupRoomControls() {
      const roomInput = document.getElementById('roomInput');
      const joinRoomBtn = document.getElementById('joinRoomBtn');

      joinRoomBtn.addEventListener('click', () => {
          const roomName = roomInput.value.trim() || 'lobby';
          this.websocket.joinRoom(roomName);
          roomInput.value = '';
      });

      roomInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
              joinRoomBtn.click();
          }
      });
  }

  setupCursorTracking() {
      let lastSentTime = 0;
      const throttleDelay = 100; // ms

      this.canvas.canvas.addEventListener('mousemove', (e) => {
          const now = Date.now();
          if (now - lastSentTime > throttleDelay) {
              const [x, y] = this.canvas.getMousePos(e);
              this.websocket.sendCursorPosition(x, y);
              lastSentTime = now;
          }
      });

      this.canvas.canvas.addEventListener('mouseleave', () => {
          // Remove our cursor when leaving canvas
          const ourCursor = document.querySelector(`[data-user-id="${this.websocket.userId}"]`);
          if (ourCursor) {
              ourCursor.remove();
          }
      });
  }

  updateUsersList(users) {
      const userList = document.getElementById('userList');
      userList.innerHTML = '';

      users.forEach(user => {
          const userItem = document.createElement('div');
          userItem.className = 'user-item';
          userItem.innerHTML = `
              <div class="user-color" style="background-color: ${user.color};"></div>
              <div class="user-name">${user.name}</div>
          `;
          userList.appendChild(userItem);
      });
  }

  updateUserCursor(cursorData) {
      let cursor = document.querySelector(`[data-user-id="${cursorData.userId}"]`);
      
      if (!cursor) {
          cursor = document.createElement('div');
          cursor.className = 'user-cursor';
          cursor.setAttribute('data-user-id', cursorData.userId);
          cursor.setAttribute('data-user', cursorData.userName);
          cursor.style.backgroundColor = cursorData.userColor;
          document.getElementById('cursorsContainer').appendChild(cursor);
      }

      const rect = this.canvas.canvas.getBoundingClientRect();
      const scaleX = this.canvas.canvas.width / rect.width;
      const scaleY = this.canvas.canvas.height / rect.height;
      
      const x = (cursorData.x / scaleX) + rect.left;
      const y = (cursorData.y / scaleY) + rect.top;

      cursor.style.left = x + 'px';
      cursor.style.top = y + 'px';
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new CollaborativeCanvasApp();
});