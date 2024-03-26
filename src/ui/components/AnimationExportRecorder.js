import SchemeContainer, { getBoundingBoxOfItems } from "../scheme/SchemeContainer";
import { exportEntireSvgPlotAsImageData } from "../diagramExporter";
import {GIFEncoder, quantize, applyPalette} from 'gifenc';

class AnimationExportRecorder {
    /**
     *
     * @param {String} editorId
     * @param {SchemeContainer} schemeContainer
     * @param {String} boundsElement elemet selector for screen bounds
     * @param {Number} duration
     * @param {Number} fps
     * @param {Number} width
     * @param {Number} height
     */
    constructor(editorId, schemeContainer, boundsElement, duration, fps, width, height) {
        this.editorId = editorId;
        this.duration = duration;
        this.boundsElement = boundsElement;
        this.fps = fps;
        this.deltaTime = 1000 / fps;
        this.intervalId = null;
        this.elapsedTime = 0;
        this.schemeContainer = schemeContainer;
        this.delay = 0;
        /** @type {Area} */
        this.width = width;
        this.height = height;
        this.bbox = null;
        this.framePromises = [];
        this.finishCallback = null;
        this.shouldStop = false;
        this.backgroundColor = '#ffffff';
    }

    setDelay(delay) {
        this.delay = delay;
    }

    setBackgroundColor(backgroundColor) {
        this.backgroundColor = backgroundColor;
    }

    onFinish(finishCallback) {
        this.finishCallback = finishCallback;
    }

    stop() {
        if (!this.intervalId) {
            return;
        }
        clearInterval(this.intervalId);
        this.intervalId = null;
        this.shouldStop = true;
    }

    /**
     * @param {String} name
     * @returns {Promise}
     */
    export(name) {
        if (this.framePromises.length === 0) {
            return Promise.resolve();
        }

        return Promise.all(this.framePromises)
        .then(framePics => {
            const gif = GIFEncoder();
            framePics.forEach(frameImageData => {
                const { data, width, height } = frameImageData;
                const palette = quantize(data, 256);
                const index = applyPalette(data, palette);
                gif.writeFrame(index, width, height, { palette, delay: this.deltaTime });
            });
            gif.finish();

            const buffer = gif.bytesView();
            let safeName = name.replace(/[\W_]+/g,"-");
            if (!safeName) {
                safeName = 'animation';
            }
            download(buffer, `${safeName}.gif`, { type: 'image/gif' });
        });
    }

    start() {
        if (this.intervalId) {
            return;
        }
        this.shouldStop = false;
        if (this.boundsElement) {
            const items = this.schemeContainer.findElementsBySelector(this.boundsElement);
            this.bbox = getBoundingBoxOfItems(items);
        } else {
            this.bbox = getBoundingBoxOfItems(this.schemeContainer.getItems());
        }
        this.elapsedTime = 0;
        this.intervalId = setInterval(() => {
            if (this.shouldStop) {
                return;
            }
            this.elapsedTime += this.deltaTime;
            if (this.elapsedTime > this.duration + this.delay) {
                this.stop();
                if (this.finishCallback) {
                    this.finishCallback();
                }
                return;
            }
            if (this.elapsedTime > this.delay) {
                this.onFrame();
            } else {
            }
        }, this.deltaTime);
    }

    onFrame() {
        this.framePromises.push(
            exportEntireSvgPlotAsImageData(this.editorId, this.bbox.x, this.bbox.y, this.bbox.w, this.bbox.h, this.width, this.height, this.backgroundColor)
            .then(framePic => {
                return framePic;
            })
            .catch(err => {
                console.error(err);
            })
        );
    }
}

export function createAnimationExportRecorder(editorId, schemeContainer, boundsElement, duration, fps, width, height) {
    return new AnimationExportRecorder(editorId, schemeContainer, boundsElement, duration, fps, width, height);
}


function download (buf, filename, type) {
    const blob = buf instanceof Blob ? buf : new Blob([buf], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
};