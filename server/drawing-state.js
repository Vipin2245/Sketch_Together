class DrawingStateManager {
  constructor() {
      this.operations = new Map(); // room -> operation list
      this.canvasStates = new Map(); // room -> current canvas state
  }

  addOperation(roomName, operation) {
      if (!this.operations.has(roomName)) {
          this.operations.set(roomName, []);
      }

      const roomOps = this.operations.get(roomName);
      roomOps.push({
          ...operation,
          id: this.generateOperationId(),
          timestamp: Date.now()
      });

      // Apply operation to current canvas state
      this.applyOperation(roomName, operation);
  }

  applyOperation(roomName, operation) {
      // In a real implementation, this would apply the operation
      // to the current canvas state and store the new state
      // For now, we'll just track the operations
      console.log(`Applying operation to room ${roomName}:`, operation.type);
  }

  undo(roomName, userId) {
      const roomOps = this.operations.get(roomName);
      if (!roomOps || roomOps.length === 0) return null;

      // Find the last operation by this user
      for (let i = roomOps.length - 1; i >= 0; i--) {
          if (roomOps[i].userId === userId) {
              const undoneOp = roomOps.splice(i, 1)[0];
              return this.createInverseOperation(undoneOp);
          }
      }
      return null;
  }

  redo(roomName, userId) {
      // In a real implementation, this would manage a redo stack
      // For now, we'll return null as this is a simplified version
      return null;
  }

  createInverseOperation(operation) {
      // Create an operation that undoes the given operation
      return {
          type: 'inverse',
          originalOp: operation,
          timestamp: Date.now()
      };
  }

  generateOperationId() {
      return 'op-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  getRoomOperations(roomName) {
      return this.operations.get(roomName) || [];
  }

  clearRoomOperations(roomName) {
      this.operations.delete(roomName);
      this.canvasStates.delete(roomName);
  }
}

module.exports = DrawingStateManager;