/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import forEach from 'lodash/forEach';

/**
 * Filters out irrelevant elements from svg element
 * also adds proper styles to elements which are usual provided by css
 * @param {SVGElement} svgElement 
 */
export function filterOutPreviewSvgElements(svgElement) {
    for (let i = svgElement.childNodes.length - 1; i >= 0; i--) {
        let child = svgElement.childNodes[i];
        if (child && child.nodeType === Node.ELEMENT_NODE) {
            if (child.getAttribute('data-preview-ignore') === 'true') {
                svgElement.removeChild(child);
            } else {
                if (child.nodeName.toLowerCase() === 'p') {
                    child.style.marginTop = 0;
                    child.style.marginBottom = 0;
                    child.style.padding = 0;
                    child.style.minHeight = '18px';
                }
                filterOutPreviewSvgElements(child);
            }
        } else if (child && child.nodeType === Node.COMMENT_NODE) {
            svgElement.removeChild(child);
        }
    }
}

function convertImageToDataURL(imageElement) {
    const imageUrl = imageElement.getAttribute('xlink:href');
    return new Promise((resolve, reject) => {
        const img = document.createElement('img');
        img.setAttribute('crossorigin', 'anonymous');
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const width = imageElement.getAttribute('width');
                const height = imageElement.getAttribute('height');

                canvas.width = width;
                canvas.height = height;

                let x = 0, y = 0, w = width, h = height;

                if (imageElement.getAttribute('preserveAspectRatio') !== 'none' && img.width > 0 && img.height > 0) {
                    const k = Math.min(width / img.width, height / img.height);
                    x = width/2 - img.width/2 * k;
                    y = height/2 - img.height/2 * k;
                    w = img.width * k;
                    h = img.height * k;
                }

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, x, y, w, h);
                const dataURL = canvas.toDataURL('image/png');
                imageElement.setAttribute('xlink:href', dataURL);
                resolve();
            } catch(err) {
                console.error('Could not convert image ' + imageURL + ' to dataURL', err);
                reject();
            }
        };
        img.onerror = () => {
            reject();
        };
        img.src = imageUrl;
    });
}


/**
 * @param {SVGElement} svgElement
 * @param {Map} map
 * @returns {Array}
 */
function collectAllImageNodes(svgElement, arr) {
    if (!arr) {
        arr = [];
    }

    if (svgElement.tagName === 'image') {
        const imageURL = svgElement.getAttribute('xlink:href');
        if (imageURL && !imageURL.startsWith('data:')) {
            arr.push(svgElement);
        }
    }

    forEach(svgElement.childNodes, child => {
        collectAllImageNodes(child, arr);
    });
    return arr;
}

/**
 * Traverses through all elements in SVG and changes images tags so that they use rasterized dataURL of image they were referencing
 * 
 * @param {SVGElement} svgElement 
 */
export function rasterizeAllImagesToDataURL(svgElement) {
    const imageElements = collectAllImageNodes(svgElement);

    const promises = [];
    forEach(imageElements, imageElement => {
        promises.push(convertImageToDataURL(imageElement));
    });

    return Promise.all(promises);
}



export function snapshotSvg(selector, viewArea) {
    let originalSvgFragment = document.querySelector(selector);
    const svgFragment = originalSvgFragment.cloneNode(true);

    return rasterizeAllImagesToDataURL(svgFragment)
    .catch(err => {})
    .then(() => {
        svgFragment.setAttribute("transform", "");

        const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgElement.setAttribute('viewBox', `${viewArea.x-10} ${viewArea.y-10} ${viewArea.w+20} ${viewArea.h+20}`);
        svgElement.setAttribute('width', viewArea.w+20);
        svgElement.setAttribute('height', viewArea.h+20);
        svgElement.setAttribute('version', '1.1');
        svgElement.setAttribute('xml:space', 'preserve');
        svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svgElement.setAttribute('xmlns:xhtml', 'http://www.w3.org/1999/xhtml');
        svgElement.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
        svgElement.appendChild(svgFragment);

        filterOutPreviewSvgElements(svgElement);

        return '<?xml version="1.0" ?>' + svgElement.outerHTML.replace(/&nbsp;/g, ' ');
    });
}
