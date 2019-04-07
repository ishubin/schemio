function drawInlineSVG(ctx, rawSVG, width, height, callback) {
    let svg = new Blob([rawSVG], {type:"image/svg+xml;charset=utf-8"}),
        domURL = self.URL || self.webkitURL || self,
        url = domURL.createObjectURL(svg),
        img = new Image;
    let cw = ctx.canvas.width;
    let ch = ctx.canvas.height;

    if (width > height) {
        ch = cw * height / width;
    } else {
        cw = ch * width / height;
    }

    img.onload = function () {
        ctx.drawImage(img, 0, 0, width, height, 0, 0, cw, ch);
        domURL.revokeObjectURL(url);
        callback();
    };
    img.onerror = function (err) {
        console.error('Error Thumbnail', err);
    };
    img.src = url;
}

function imageToDataURL(src, callback) {
    let img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function() {
        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');
        canvas.height = this.naturalHeight;
        canvas.width = this.naturalWidth;
        ctx.drawImage(this, 0, 0);
        callback(canvas.toDataURL('image/png'));
    };
    img.onerror = function() {
        callback(null);
    };
    try {
        img.src = src;
    } catch(err) {
        callback(null);
    }
}

function embedImageIntoSvg(imageElement) {
    let url = imageElement.getAttribute('xlink:href');
    return new Promise((resolve, reject) => {
        imageToDataURL(url, resolve);
    }).then(dataUrl => {
        imageElement.setAttribute('xlink:href', dataUrl);
    });
}

function filterOutPreviewSvgElements(svgElement) {
    let promises = [];
    for (let i = svgElement.childNodes.length - 1; i >= 0; i--) {
        let child = svgElement.childNodes[i];
        if (child && child.nodeType === 1) {
            if (child.getAttribute('data-preview-ignore') === 'true') {
                svgElement.removeChild(child);
            } else {
                if (child.getAttribute('data-type') === 'overlay') {
                    child.style.opacity = 0.3;
                }
                if (child.nodeName === 'image') {
                    promises.push(embedImageIntoSvg(child));
                } else {
                    promises = promises.concat(filterOutPreviewSvgElements(child));
                }
            }
        }
    }
    return promises;
}

function getScreenPosition(svgWidth, svgHeight, area) {
    let newScale = 1.0;
    if (area.w > 0 && area.h > 0 && svgWidth > 0 && svgHeight > 0) {
        newScale = Math.floor(100.0 * Math.min(svgWidth/area.w, svgHeight/area.h)) / 100.0;
        newScale = Math.max(0.05, Math.min(newScale, 10.0));
    }

    return {
        offsetX: svgWidth/2 - (area.x + area.w/2) * newScale,
        offsetY: svgHeight/2 - (area.y + area.h/2) *newScale,
        scale: newScale
    };
}

function findTransformLayer(svgElement) {
    for (let i = 0; i < svgElement.childNodes.length - 1; i++) {
        if (svgElement.childNodes[i].getAttribute('transform')) {
            return svgElement.childNodes[i];
        }
    }
    return null;
}

export default function createSchemePreview(previewWidth, previewHeight, selector, zoomArea) {
    let canvas = document.createElement('canvas');
    let context = canvas.getContext('2d');
    canvas.width = previewWidth;
    canvas.height = previewHeight;

    context.clearRect(0, 0, previewWidth, previewHeight);

    let originalSvg = document.querySelector(selector);
    let svgElement = originalSvg.cloneNode(true);

    svgElement.setAttribute('width', `${previewWidth}px`);
    svgElement.setAttribute('height', `${previewHeight}px`);

    if (zoomArea) {
        let screenPosition = getScreenPosition(previewWidth, previewHeight, zoomArea);
        let layer = findTransformLayer(svgElement);
        console.log('screenPosition', screenPosition);
        if (layer) {
            layer.setAttribute('transform', `translate(${screenPosition.offsetX} ${screenPosition.offsetY}) scale(${screenPosition.scale} ${screenPosition.scale})`);
        }
    }

    let promises = filterOutPreviewSvgElements(svgElement);

    return Promise.all(promises).then(() => {
        var svgString = new XMLSerializer().serializeToString(svgElement);
        return new Promise((resolve, reject) => {
            drawInlineSVG(context, svgString, previewWidth, previewHeight, () => {
                resolve(canvas.toDataURL('image/png'));
            });
        });
    });
}
