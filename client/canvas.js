class DrawingCanvas {
  constructor(canvasElement) {
      this.canvas = canvasElement;
      this.ctx = canvasElement.getContext('2d');
      this.isDrawing = false;
      this.lastX = 0;
      this.lastY = 0;
      this.currentTool = 'brush';
      this.currentColor = '#333344';
      this.brushSize = 5;
      
      // Drawing state
      this.drawingHistory = [];
      this.historyIndex = -1;
      this.currentStroke = null;
      
      this.initializeCanvas();
      this.setupEventListeners();
  }

  initializeCanvas() {
      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());
      
      // Set initial canvas background
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      this.addToHistory();
  }

  resizeCanvas() {
      const container = this.canvas.parentElement;
      const prevWidth = this.canvas.width;
      const prevHeight = this.canvas.height;
      
      this.canvas.width = container.clientWidth - 40;
      this.canvas.height = 500;
      
      // Redraw content if canvas was resized and had content
      if (prevWidth > 0 && prevHeight > 0 && this.drawingHistory.length > 0) {
          this.redrawFromHistory();
      }
  }

  setupEventListeners() {
      // Mouse events
      this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
      this.canvas.addEventListener('mousemove', (e) => this.draw(e));
      this.canvas.addEventListener('mouseup', () => this.stopDrawing());
      this.canvas.addEventListener('mouseout', () => this.stopDrawing());

      // Touch events
      this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
      this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
      this.canvas.addEventListener('touchend', () => this.handleTouchEnd());
  }

  getMousePos(e) {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      
      return [
          (e.clientX - rect.left) * scaleX,
          (e.clientY - rect.top) * scaleY
      ];
  }

  getTouchPos(touch) {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      
      return [
          (touch.clientX - rect.left) * scaleX,
          (touch.clientY - rect.top) * scaleY
      ];
  }

  startDrawing(e) {
      this.isDrawing = true;
      [this.lastX, this.lastY] = this.getMousePos(e);
      
      this.currentStroke = {
          tool: this.currentTool,
          color: this.currentTool === 'eraser' ? '#FFFFFF' : this.currentColor,
          size: this.brushSize,
          points: [{x: this.lastX, y: this.lastY}]
      };

      this.ctx.beginPath();
      this.ctx.moveTo(this.lastX, this.lastY);

      // Emit start drawing event
      this.emitDrawingEvent('start', {
          x: this.lastX,
          y: this.lastY,
          tool: this.currentTool,
          color: this.currentColor,
          size: this.brushSize
      });
  }

  draw(e) {
      if (!this.isDrawing) return;

      const [x, y] = this.getMousePos(e);

      if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
          this.ctx.lineJoin = 'round';
          this.ctx.lineCap = 'round';
          this.ctx.lineWidth = this.brushSize;
          this.ctx.strokeStyle = this.currentTool === 'eraser' ? '#FFFFFF' : this.currentColor;

          this.ctx.lineTo(x, y);
          this.ctx.stroke();

          this.currentStroke.points.push({x, y});

          // Emit drawing point
          this.emitDrawingEvent('draw', { x, y });
      }

      [this.lastX, this.lastY] = [x, y];
  }

  stopDrawing() {
      if (!this.isDrawing) return;

      this.isDrawing = false;
      this.ctx.closePath();

      if (this.currentStroke && this.currentStroke.points.length > 1) {
          this.emitDrawingEvent('end', {});
          this.addToHistory();
      }

      this.currentStroke = null;
  }

  handleTouchStart(e) {
      e.preventDefault();
      if (e.touches.length === 1) {
          const touch = e.touches[0];
          const [x, y] = this.getTouchPos(touch);
          
          // Simulate mouse events for drawing
          const mouseEvent = new MouseEvent('mousedown', {
              clientX: touch.clientX,
              clientY: touch.clientY
          });
          this.canvas.dispatchEvent(mouseEvent);
      }
  }

  handleTouchMove(e) {
      e.preventDefault();
      if (e.touches.length === 1) {
          const touch = e.touches[0];
          const mouseEvent = new MouseEvent('mousemove', {
              clientX: touch.clientX,
              clientY: touch.clientY
          });
          this.canvas.dispatchEvent(mouseEvent);
      }
  }

  handleTouchEnd() {
      const mouseEvent = new MouseEvent('mouseup', {});
      this.canvas.dispatchEvent(mouseEvent);
  }

  emitDrawingEvent(type, data) {
      const event = new CustomEvent('drawing', {
          detail: {
              type,
              ...data,
              tool: this.currentTool,
              color: this.currentColor,
              size: this.brushSize,
              timestamp: Date.now()
          }
      });
      this.canvas.dispatchEvent(event);
  }

  // External drawing (from other users)
  drawExternalStroke(strokeData) {
      if (!strokeData.points || strokeData.points.length === 0) return;

      this.ctx.save();
      this.ctx.lineJoin = 'round';
      this.ctx.lineCap = 'round';
      this.ctx.lineWidth = strokeData.size;
      this.ctx.strokeStyle = strokeData.color;

      this.ctx.beginPath();
      this.ctx.moveTo(strokeData.points[0].x, strokeData.points[0].y);

      for (let i = 1; i < strokeData.points.length; i++) {
          this.ctx.lineTo(strokeData.points[i].x, strokeData.points[i].y);
      }

      this.ctx.stroke();
      this.ctx.restore();
  }

  // History management
  addToHistory() {
      // Remove future history if we're not at the end
      if (this.historyIndex < this.drawingHistory.length - 1) {
          this.drawingHistory = this.drawingHistory.slice(0, this.historyIndex + 1);
      }

      const snapshot = this.canvas.toDataURL();
      this.drawingHistory.push(snapshot);
      this.historyIndex = this.drawingHistory.length - 1;

      this.updateHistoryButtons();
  }

  undo() {
      if (this.historyIndex > 0) {
          this.historyIndex--;
          this.redrawFromHistory();
          this.updateHistoryButtons();
          return true;
      }
      return false;
  }

  redo() {
      if (this.historyIndex < this.drawingHistory.length - 1) {
          this.historyIndex++;
          this.redrawFromHistory();
          this.updateHistoryButtons();
          return true;
      }
      return false;
  }

  redrawFromHistory() {
      const img = new Image();
      img.onload = () => {
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
          this.ctx.drawImage(img, 0, 0);
      };
      img.src = this.drawingHistory[this.historyIndex];
  }

  updateHistoryButtons() {
      const undoBtn = document.getElementById('undoBtn');
      const redoBtn = document.getElementById('redoBtn');
      
      if (undoBtn) undoBtn.disabled = this.historyIndex <= 0;
      if (redoBtn) redoBtn.disabled = this.historyIndex >= this.drawingHistory.length - 1;
  }

  clearCanvas() {
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.addToHistory();
      
      // Emit clear event
      const event = new CustomEvent('canvasCleared');
      this.canvas.dispatchEvent(event);
  }

  setTool(tool) {
      this.currentTool = tool;
  }

  setColor(color) {
      this.currentColor = color;
  }

  setBrushSize(size) {
      this.brushSize = size;
  }

  getCanvasState() {
      return this.canvas.toDataURL();
  }

  loadCanvasState(dataUrl) {
      const img = new Image();
      img.onload = () => {
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
          this.ctx.drawImage(img, 0, 0);
      };
      img.src = dataUrl;
  }
}