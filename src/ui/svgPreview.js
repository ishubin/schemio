/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


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
                // if (child.nodeName === 'image') {
                //     promises.push(embedImageIntoSvg(child));
                // } else {
                //     promises = promises.concat(filterOutPreviewSvgElements(child));
                // }
                promises = promises.concat(filterOutPreviewSvgElements(child));
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
        if (svgElement.childNodes[i].nodeType === 1 && svgElement.childNodes[i].getAttribute('data-type') === "scene-transform") {
            return svgElement.childNodes[i];
        }
    }
    return null;
}

export default function snapshotSvg(previewWidth, previewHeight, selector, zoomArea) {
    let originalSvg = document.querySelector(selector);
    let svgElement = originalSvg.cloneNode(true);

    // svgElement.setAttribute('width', `${previewWidth}px`);
    // svgElement.setAttribute('height', `${previewHeight}px`);
    svgElement.setAttribute('viewBox', '0 0 1200 600');
    svgElement.setAttribute('version', '1.1');
    svgElement.setAttribute('xml:space', 'preserve');
    svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgElement.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

    // if (zoomArea) {
    //     let screenPosition = getScreenPosition(previewWidth, previewHeight, zoomArea);
    //     let layer = findTransformLayer(svgElement);
    //     if (layer) {
    //         layer.setAttribute('transform', `translate(${screenPosition.offsetX} ${screenPosition.offsetY}) scale(${screenPosition.scale} ${screenPosition.scale})`);
    //     }
    // }

    let promises = filterOutPreviewSvgElements(svgElement);

    return Promise.all(promises).then(() => {
        return '<?xml version="1.0" ?>' + svgElement.outerHTML;
    });
}
