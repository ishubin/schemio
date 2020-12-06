/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */



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


export function snapshotSvg(selector, viewArea) {
    let originalSvgFragment = document.querySelector(selector);
    let svgFragment = originalSvgFragment.cloneNode(true);
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
}
