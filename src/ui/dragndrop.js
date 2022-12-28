
export function dragAndDropBuilder(originalEvent) {
    return {
        originalEvent,
        originalPageX: originalEvent.touches? originalEvent.touches[0].pageX : originalEvent.pageX,
        originalPageY: originalEvent.touches? originalEvent.touches[0].pageY : originalEvent.pageY,
        draggedElement: null,
        droppableClass: null,
        scrollableElemet: null,

        callbacks: {
            onDrag: () => {},
            onDragOver: () => {},
            onDrop: () => {},
            onDragStart: () => {},
            onSimpleClick: () => {},
            onDone: () => {}
        },

        withScrollableElement(element) {
            this.scrollableElemet = element;
            return this;
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

            let mouseMoveEventName = originalEvent.touches ? 'touchmove' : 'mousemove';
            let mouseUpEventName = originalEvent.touches ? 'touchend' : 'mouseup';

            const reset = (event) => {
                document.removeEventListener(mouseMoveEventName, onMouseMove);
                document.removeEventListener(mouseUpEventName, onMouseUp);

                // making sure that it was not right click
                if (!startedDragging && originalEvent.button !== 2) {
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

            const scrollMargin = 20;
            let scrollIntervalId = null;
            let lastScrollingStep = 0;
            const startScrolling = (scrollStep) => {
                if (!scrollIntervalId || lastScrollingStep !== scrollStep) {
                    stopScrolling();
                    lastScrollingStep = scrollStep;
                    scrollIntervalId = setInterval(() => {
                        this.scrollableElemet.scrollTop += scrollStep;
                    }, 10);
                }
            };
            const stopScrolling = () => {
                if (scrollIntervalId) {
                    clearInterval(scrollIntervalId);
                    scrollIntervalId = null;
                    lastScrollingStep = 0;
                }
            }

            const originalClickX = originalEvent.touches ? originalEvent.touches[0].pageX: originalEvent.pageX;
            const originalClickY = originalEvent.touches ? originalEvent.touches[0].pageY: originalEvent.pageY;

            const onMouseMove = (event) => {
                if (event.buttons === 0) {
                    reset(event);
                    return;
                }

                let eventPageX = event.touches ? event.touches[0].pageX : event.pageX;
                let eventPageY = event.touches ? event.touches[0].pageY : event.pageY;

                pixelsMoved += Math.abs(eventPageX - this.originalPageX) + Math.abs(eventPageY - this.originalPageY);

                if (startedDragging) {
                    if (this.draggedElement) {
                        this.draggedElement.style.left = `${eventPageX + 4}px`;
                        this.draggedElement.style.top = `${eventPageY + 4}px`;
                    }
                    this.callbacks.onDrag(event, eventPageX, eventPageY, originalClickX, originalClickY);
                    withDroppableElement(event , element => this.callbacks.onDragOver(event, element));

                    if (this.scrollableElemet) {
                        const rootBbox = this.scrollableElemet.getBoundingClientRect();
                        if (rootBbox.bottom - eventPageY < scrollMargin) {
                            startScrolling(2);
                        } else if (rootBbox.top - eventPageY > -scrollMargin) {
                            startScrolling(-2);
                        } else {
                            stopScrolling();
                        }
                    }

                } else {
                    if (pixelsMoved > pixelMoveThreshold) {
                        startedDragging = true;
                        this.callbacks.onDragStart(event, originalClickX, originalClickY);
                    }
                }
            };

            const onMouseUp = (event) => {
                stopScrolling();
                try {
                    if (startedDragging) {
                        withDroppableElement(event , element => this.callbacks.onDrop(event, element, eventPageX, eventPageY));
                    }
                } catch (err) {
                    console.error(err);
                }
                reset(event);
            };

            document.addEventListener(mouseMoveEventName, onMouseMove);
            document.addEventListener(mouseUpEventName, onMouseUp);
        }
    }
}