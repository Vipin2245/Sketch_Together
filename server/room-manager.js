class RoomManager {
  constructor() {
      this.rooms = new Map();
      this.defaultCanvasState = this.createBlankCanvas();
  }

  createBlankCanvas() {
      // In a real implementation, this would be a proper blank canvas data URL
      // For now, we'll use a simple representation
      return 'blank';
  }

  addUserToRoom(roomName, userId, userData) {
      if (!this.rooms.has(roomName)) {
          this.rooms.set(roomName, {
              users: new Map(),
              canvasData: this.defaultCanvasState,
              drawingHistory: []
          });
      }

      const room = this.rooms.get(roomName);
      room.users.set(userId, userData);

      return Array.from(room.users.values());
  }

  removeUserFromRoom(roomName, userId) {
      if (!this.rooms.has(roomName)) return [];

      const room = this.rooms.get(roomName);
      room.users.delete(userId);

      // Clean up empty rooms
      if (room.users.size === 0) {
          this.rooms.delete(roomName);
          return [];
      }

      return Array.from(room.users.values());
  }

  getRoomState(roomName) {
      if (!this.rooms.has(roomName)) {
          return {
              users: [],
              canvasData: this.defaultCanvasState
          };
      }

      const room = this.rooms.get(roomName);
      return {
          users: Array.from(room.users.values()),
          canvasData: room.canvasData
      };
  }

  addDrawingToHistory(roomName, drawingData) {
      if (!this.rooms.has(roomName)) return;

      const room = this.rooms.get(roomName);
      room.drawingHistory.push({
          ...drawingData,
          timestamp: Date.now()
      });

      // Limit history size to prevent memory issues
      if (room.drawingHistory.length > 1000) {
          room.drawingHistory = room.drawingHistory.slice(-500);
      }
  }

  clearRoomCanvas(roomName) {
      if (!this.rooms.has(roomName)) return;

      const room = this.rooms.get(roomName);
      room.canvasData = this.defaultCanvasState;
      room.drawingHistory = [];
  }

  getRoomCount() {
      return this.rooms.size;
  }

  getUserCount() {
      let totalUsers = 0;
      for (const room of this.rooms.values()) {
          totalUsers += room.users.size;
      }
      return totalUsers;
  }

  getRoomUsers(roomName) {
      if (!this.rooms.has(roomName)) return [];
      return Array.from(this.rooms.get(roomName).users.values());
  }
}

module.exports = RoomManager;