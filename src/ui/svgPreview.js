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

export default function createSchemePreview(previewWidth, previewHeight, selector) {
    var previewWidth = 500;
    var previewHeight = 400;

    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    canvas.width = previewWidth;
    canvas.height = previewHeight;

    context.clearRect(0, 0, previewWidth, previewHeight);

    let originalSvg = document.querySelector(selector);
    let bbRect = originalSvg.getBoundingClientRect();

    let svgElement = originalSvg.cloneNode(true);
    let promises = filterOutPreviewSvgElements(svgElement);

    return Promise.all(promises).then(() => {
        var svgString = new XMLSerializer().serializeToString(svgElement);
        return new Promise((resolve, reject) => {
            drawInlineSVG(context, svgString, bbRect.width, bbRect.height, () => {
                resolve(canvas.toDataURL('image/png'));
            });
        });
    });
}
