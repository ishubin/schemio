import { map } from "./collections";
import { traverseItems } from "./scheme/Item";
import { getBoundingBoxOfItems, worldAngleOfItem, worldPointOnItem } from "./scheme/SchemeContainer";
import { filterOutPreviewSvgElements, rasterizeAllImagesToDataURL } from './svgPreview';
import { encode } from 'js-base64';
import axios from "axios";


/**
 * @typedef {Object} ItemHTML
 * @property {Object} item
 * @property {String} html
 */

/**
 * @typedef {Object} DiagramPictureBox
 * @property {Array<ItemHTML>} exportedItems
 * @property {Number} width
 * @property {Number} height
 */



/**
 * Fetches svg content for specified items, calculates their bounding box and returns it
 * @param {Array<Object>} items items from the diagram
 * @returns {DiagramPictureBox}
 */
export function prepareDiagramForPictureExport(items) {
    if (items.length === 0) {
        return {
            exportedItems: [],
            width: 0,
            height: 0,
        };
    }
    const exportedItems = [];
    let minP = null;
    let maxP = null;

    const collectedItems = [];

    items.forEach(item => {
        if (item.visible && item.opacity > 0.0001) {
            const domElement = document.querySelector(`g[data-svg-item-container-id="${item.id}"]`);
            if (domElement) {
                const itemBoundingBox = calculateBoundingBoxOfAllSubItems(item);
                if (minP) {
                    minP.x = Math.min(minP.x, itemBoundingBox.x);
                    minP.y = Math.min(minP.y, itemBoundingBox.y);
                } else {
                    minP = {
                        x: itemBoundingBox.x,
                        y: itemBoundingBox.y
                    };
                }
                if (maxP) {
                    maxP.x = Math.max(maxP.x, itemBoundingBox.x + itemBoundingBox.w);
                    maxP.y = Math.max(maxP.y, itemBoundingBox.y + itemBoundingBox.h);
                } else {
                    maxP = {
                        x: itemBoundingBox.x + itemBoundingBox.w,
                        y: itemBoundingBox.y + itemBoundingBox.h
                    };
                }
                const itemDom = domElement.cloneNode(true);
                filterOutPreviewSvgElements(itemDom);
                collectedItems.push({
                    item, itemDom
                });
            }
        }
    });

    collectedItems.forEach(collectedItem => {
        const item = collectedItem.item;
        const itemDom = collectedItem.itemDom;
        const worldPoint = worldPointOnItem(0, 0, item);
        const angle = worldAngleOfItem(item);
        const x = worldPoint.x - minP.x;
        const y = worldPoint.y - minP.y;

        itemDom.setAttribute('transform', `translate(${x},${y}) rotate(${angle})`);
        const html = itemDom.outerHTML;
        exportedItems.push({item, html})
    });

    const result = {
        exportedItems,
        width: maxP.x - minP.x,
        height: maxP.y - minP.y,
    }
    if (result.width > 5) {
        result.width = Math.round(result.width);
    }
    if (result.height > 5) {
        result.height = Math.round(result.height);
    }

    // this check is needed when exporting straight vertical or horizontal path lines
    // in such case area is defined with zero width or height and it confuses SVG exporter
    if (result.width < 0.001) {
        result.width = 20;
    }
    if (result.height < 0.001) {
        result.height = 20;
    }
    return result;
}

/**
 * Calculates bounding box taking all sub items into account and excluding the ones that are not visible
 */
function calculateBoundingBoxOfAllSubItems(parentItem) {
    const items = [];
    traverseItems([parentItem], item => {
        if (item.visible && item.opacity > 0.0001) {
            // we don't want dummy shapes to effect the view area as these shapes are not supposed to be visible
            if (item.shape !== 'dummy' && item.selfOpacity > 0.0001) {
                items.push(item);
            }
        }
    });
    return getBoundingBoxOfItems(items);
}

/**
 * Exports specified svg code as png image
 * @param {String} svgHtml outer HTML of SVG element
 * @param {*} imageWidth width of resulting image
 * @param {*} imageHeight height of resulting image
 * @param {*} paddingLeft left padding in the image
 * @param {*} paddingTop top padding in the image
 * @param {*} backgroundColor background color of the image, if set as null then it will not be used and the background will be transparent
 */
export function svgToImage(svgHtml, imageWidth, imageHeight, paddingLeft, paddingTop, backgroundColor) {
    return new Promise((resolve, reject) => {
        const svgDataUrl = `data:image/svg+xml;base64,${encode(svgHtml)}`;
        const canvas = document.createElement('canvas');
        canvas.width = imageWidth;
        canvas.height = imageHeight;

        const ctx = canvas.getContext('2d');
        const img = new Image;

        img.onload = () => {
            if (backgroundColor) {
                ctx.fillStyle = backgroundColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            ctx.drawImage(img, paddingLeft, paddingTop);
            resolve(canvas.toDataURL('image/png'));
        };
        img.src = svgDataUrl;

        img.onerror = (err) => reject(err);
    });
}

export function diagramImageExporter(items) {
    const result = prepareDiagramForPictureExport(items);
    return {
        exportImage(imageWidth, imageHeight, paddingLeft, paddingTop, backgroundColor) {
            const box = getBoundingBoxOfItems(items);
            const svgHtml = map(result.exportedItems, e => e.html).join('\n');

            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.innerHTML = svgHtml;
            svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            svg.setAttribute('xmlns:xhtml', "http://www.w3.org/1999/xhtml");
            svg.setAttribute('xmlns:xlink', "http://www.w3.org/1999/xlink");
            svg.setAttribute('viewBox', `${-paddingLeft} ${-paddingTop} ${box.w + paddingLeft} ${box.h + paddingTop}`);
            svg.setAttribute('preserveAspectRatio', 'xMidYMid');
            svg.setAttribute('width', `${imageWidth}px`);
            svg.setAttribute('height', `${imageHeight}px`);

            return rasterizeAllImagesToDataURL(svg)
            .then(() => insertCustomFonts(svg))
            .then(() => svgToImage(svg.outerHTML, imageWidth, imageHeight, paddingLeft, paddingTop, backgroundColor));
        }
    };
}

function insertCustomFonts(svg) {
    return axios.get('/assets/custom-fonts/all-fonts-embedded.css')
    .then(data => {
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defs.innerHTML = '<style>\n' + data.data + '\n</style>';
        svg.prepend(defs);
    })
    .catch(err => {
        console.error(err);
    });
}