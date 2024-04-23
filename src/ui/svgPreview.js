/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { forEach } from "./collections";


function isEmptyForeignObject(node) {
    if (node.nodeName !== 'foreignObject') {
        return false;
    }

    if (node.childNodes.length > 0) {
        if (node.childNodes[0].innerText !== '') {
            return false;
        }
    }
    return true;
}

/**
 * Filters out irrelevant elements from svg element
 * also adds proper styles to elements which are usually provided by css
 * @param {SVGElement} svgElement
 */
export function processSvgElementsForExport(svgElement) {
    for (let i = svgElement.childNodes.length - 1; i >= 0; i--) {
        let child = svgElement.childNodes[i];
        if (child && child.nodeType === Node.ELEMENT_NODE) {
            if (child.getAttribute('data-preview-ignore') === 'true'
                || isEmptyForeignObject(child)
            ) {
                svgElement.removeChild(child);
            } else {
                if (child.nodeName.toLowerCase() === 'p') {
                    child.style.marginTop = 0;
                    child.style.marginBottom = 0;
                    child.style.padding = 0;
                    child.style.minHeight = '18px';
                }


                child.getAttributeNames().forEach(attrName => {
                    if (attrName.startsWith('data-')) {
                        child.removeAttribute(attrName);
                    }
                });

                processSvgElementsForExport(child);
            }
        } else if (child && child.nodeType === Node.COMMENT_NODE) {
            svgElement.removeChild(child);
        }
    }
}

function toDataURL(url) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('get', url);
        xhr.responseType = 'blob';
        xhr.onload = function() {
            const fr = new FileReader();
            fr.onload = function() {
                resolve(this.result);
            };
            fr.onerror = function(err) {
                reject(err);
            };
            fr.readAsDataURL(xhr.response);
        };
        xhr.onerror = function(err) {
            reject(err);
        };
        xhr.send();
    })
}


/**
 * @param {String} imageUrl
 * @param {Array<SVGImageElement>} imageElements
 * @returns {Promise}
 */
function convertImagesToDataURL(imageUrl, imageElements) {
    // adding unique get parameter because Chrome may cache the image when it was loaded without passing the origin
    // so in its cache there might be an image without the CORS allow header.
    const argName = imageUrl.indexOf('?') < 0 ? '?_schuid=' : '&_schuid=';
    const retryUrl = imageUrl + argName + new Date().getTime() + '' + Math.round(Math.random()*10000);

    return toDataURL(imageUrl)
    .catch(err => {
        return toDataURL(retryUrl);
    })
    .catch(err => {
        if (retryUrl.charAt(0) !== '/') {
            return toDataURL('https://corsproxy.io/?' + encodeURIComponent(imageUrl));
        }
        throw err;
    })
    .then((dataURL) => {
        imageElements.forEach(imageElement => {
            imageElement.setAttribute('xlink:href', dataURL);
        });
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

    // Grouping all image elements by images first.
    // This is needed to avoid situations when multiple items use the same image
    // Since promises are all created in parallel - they all refetch the same image
    const imageGroups = new Map();

    forEach(imageElements, imageElement => {
        const imageUrl = imageElement.getAttribute('xlink:href');

        if (imageGroups.has(imageUrl)) {
            imageGroups.get(imageUrl).push(imageElement);
        } else {
            imageGroups.set(imageUrl, [imageElement]);
        }
    });

    imageGroups.forEach((elements, imageUrl) => {
        promises.push(convertImagesToDataURL(imageUrl, elements));
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

        processSvgElementsForExport(svgElement);

        return '<?xml version="1.0" ?>' + new XMLSerializer().serializeToString(svgElement);
    });
}
