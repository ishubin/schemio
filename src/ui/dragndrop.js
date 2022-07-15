
export function dragAndDropBuilder(originalEvent) {
    return {
        originalEvent,
        originalPageX: originalEvent.pageX,
        originalPageY: originalEvent.pageY,
        draggedElement: null,
        droppableClass: null,

        callbacks: {
            onDrag: () => {},
            onDragOver: () => {},
            onDrop: () => {},
            onDragStart: () => {},
            onSimpleClick: () => {},
            onDone: () => {}
        },

        withDraggedElement(draggedElement) {
            this.draggedElement = draggedElement;
            return this;
        },

        withDroppableClass(cssClass) {
            this.droppableClass = cssClass;
            return this;
        },

        onDragStart(callback) {
            this.callbacks.onDragStart = callback;
            return this;
        },
        onDrag(callback) {
            this.callbacks.onDrag = callback;
            return this;
        },
        onDragOver(callback) {
            this.callbacks.onDragOver = callback;
            return this;
        },
        onDrop(callback) {
            this.callbacks.onDrop = callback;
            return this;
        },
        onSimpleClick(callback) {
            this.callbacks.onSimpleClick = callback;
            return this;
        },
        onDone(callback) {
            this.callbacks.onDone = callback;
            return this;
        },

        build() {
            let pixelsMoved = 0;
            const pixelMoveThreshold = 5;
            let startedDragging = false;

            const reset = (event) => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                if (!startedDragging) {
                    this.callbacks.onSimpleClick(event);
                }
                startedDragging = false;
                this.callbacks.onDone();
            };

            const withDroppableElement = (event, callback) => {
                if (this.droppableClass) {
                    const droppableElement = event.target.closest(`.${this.droppableClass}`);
                    if (droppableElement) {
                        callback(droppableElement);
                    }
                }
            };

            const onMouseMove = (event) => {
                if (event.buttons === 0) {
                    reset(event);
                    return;
                }

                pixelsMoved += Math.abs(event.pageX - this.originalPageX) + Math.abs(event.pageY - this.originalPageY);

                if (startedDragging) {
                    if (this.draggedElement) {
                        this.draggedElement.style.left = `${event.pageX + 4}px`;
                        this.draggedElement.style.top = `${event.pageY + 4}px`;
                    }
                    this.callbacks.onDrag(event);
                    withDroppableElement(event , element => this.callbacks.onDragOver(event, element));
                } else {
                    if (pixelsMoved > pixelMoveThreshold) {
                        startedDragging = true;
                        this.callbacks.onDragStart(event);
                    }
                }
            };

            const onMouseUp = (event) => {
                try {
                    if (startedDragging) {
                        withDroppableElement(event , element => this.callbacks.onDrop(event, element));
                    }
                } catch (err) {
                    console.error(err);
                }
                reset(event);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        }
    }
}