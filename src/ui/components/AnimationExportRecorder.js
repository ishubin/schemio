import SchemeContainer, { getBoundingBoxOfItems } from "../scheme/SchemeContainer";
import { exportEntireSvgPlotAsImageData } from "../diagramExporter";
import {GIFEncoder, quantize, applyPalette} from 'gifenc';

class AnimationExportRecorder {
    /**
     *
     * @param {String} editorId
     * @param {SchemeContainer} schemeContainer
     * @param {Number} duration
     * @param {Number} fps
     */
    constructor(editorId, schemeContainer, duration, fps, width, height) {
        this.editorId = editorId;
        this.duration = duration;
        this.fps = fps;
        this.deltaTime = 1000 / fps;
        this.intervalId = null;
        this.elapsedTime = 0;
        this.schemeContainer = schemeContainer;
        /** @type {Area} */
        this.width = width;
        this.height = height;
        this.bbox = null;
        this.framePromises = [];
        this.finishCallback = null;
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
    }

    export() {
        Promise.all(this.framePromises)
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
            download(buffer, 'animation.gif', { type: 'image/gif' });
        });

    }

    start() {
        if (this.intervalId) {
            return;
        }

        this.bbox = getBoundingBoxOfItems(this.schemeContainer.getItems());
        this.elapsedTime = 0;
        this.intervalId = setInterval(() => {
            this.elapsedTime += this.deltaTime;
            if (this.elapsedTime > this.duration) {
                this.stop();
                if (this.finishCallback) {
                    this.finishCallback();
                }
                return;
            }
            this.onFrame();
        }, this.deltaTime);
    }

    onFrame() {
        this.framePromises.push(
            exportEntireSvgPlotAsImageData(this.editorId, this.bbox.x, this.bbox.y, this.bbox.w, this.bbox.h, this.width, this.height)
            .then(framePic => {
                return framePic;
            })
            .catch(err => {
                console.error(err);
            })
        );
    }
}

export function createAnimationExportRecorder(editorId, schemeContainer, duration, fps, width, height) {
    return new AnimationExportRecorder(editorId, schemeContainer, duration, fps, width, height);
}


function download (buf, filename, type) {
    const blob = buf instanceof Blob ? buf : new Blob([buf], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
};