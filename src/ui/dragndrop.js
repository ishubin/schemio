export function getPageCoordsFromEvent(event) {
    if (event.changedTouches && event.changedTouches.length > 0) {
        return {
            pageX: event.changedTouches[0].pageX,
            pageY: event.changedTouches[0].pageY,
        }
    } else if (event.touches && event.touches.length > 0) {
        return {
            pageX: event.touches[0].pageX,
            pageY: event.touches[0].pageY,
        }
    }
    return {
        pageX: event.pageX,
        pageY: event.pageY,
    };
}

export function dragAndDropBuilder(originalEvent) {
    const originalCoords = getPageCoordsFromEvent(originalEvent);
    return {
        originalEvent,
        originalPageX: originalCoords.pageX,
        originalPageY: originalCoords.pageY,
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

            const coords = getPageCoordsFromEvent(this.originalEvent)
            const originalClickX = coords.pageX;
            const originalClickY = coords.pageY;

            const onMouseMove = (event) => {
                if (event.buttons === 0) {
                    reset(event);
                    return;
                }

                const {pageX, pageY} = getPageCoordsFromEvent(event);

                pixelsMoved += Math.abs(pageX - this.originalPageX) + Math.abs(pageY - this.originalPageY);

                if (startedDragging) {
                    if (this.draggedElement) {
                        this.draggedElement.style.left = `${pageX + 4}px`;
                        this.draggedElement.style.top = `${pageY + 4}px`;
                    }
                    this.callbacks.onDrag(event, pageX, pageY, originalClickX, originalClickY);
                    withDroppableElement(event , element => this.callbacks.onDragOver(event, element, pageX, pageY));

                    if (this.scrollableElemet) {
                        const rootBbox = this.scrollableElemet.getBoundingClientRect();
                        if (rootBbox.bottom - pageY < scrollMargin) {
                            startScrolling(2);
                        } else if (rootBbox.top - pageY > -scrollMargin) {
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
                const {pageX, pageY} = getPageCoordsFromEvent(event);
                stopScrolling();
                try {
                    if (startedDragging) {
                        withDroppableElement(event , element => this.callbacks.onDrop(event, element, pageX, pageY));
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