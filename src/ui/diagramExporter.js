import { map } from "./collections";
import { traverseItems } from "./scheme/Item";
import { getBoundingBoxOfItems, worldAngleOfItem, worldPointOnItem } from "./scheme/SchemeContainer";
import { processSvgElementsForExport, rasterizeAllImagesToDataURL } from './svgPreview';
import { encode } from 'js-base64';
import axios from "axios";
import { enrichObjectWithDefaults } from "../defaultify";
import { fontMapping } from "./scheme/FontMapping";


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
                processSvgElementsForExport(itemDom);
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
        const html = new XMLSerializer().serializeToString(itemDom);
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
 * @typedef {Object} DiagramExporterOptions
 * @property {Number} width
 * @property {Number} height
 * @property {Number} paddingLeft
 * @property {Number} paddingRight
 * @property {Number} paddingTop
 * @property {Number} paddingBottom
 * @property {String} backgroundColor
 * @property {String} format - Image format. Either "svg" or "png"
 */

const defaultDiagramExporterOptions = {
    width: 100,
    height: 100,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: null,
    format: 'svg'
}

export function diagramImageExporter(items) {
    const result = prepareDiagramForPictureExport(items);
    const previewSvgHtml = map(result.exportedItems, e => e.html).join('\n');

    return {
        previewSvgHtml,
        width: result.width,
        height: result.height,

        /**
         *
         * @param {DiagramExporterOptions} options
         * @returns {Promise<String>} image data url
         */
        exportImage(options) {
            options = enrichObjectWithDefaults(options, defaultDiagramExporterOptions);

            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.innerHTML = previewSvgHtml;
            svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            svg.setAttribute('xmlns:xhtml', "http://www.w3.org/1999/xhtml");
            svg.setAttribute('xmlns:xlink', "http://www.w3.org/1999/xlink");
            const viewBoxWidth = result.width + options.paddingRight + options.paddingLeft;
            const viewBoxHeight = result.height + options.paddingBottom + options.paddingTop;
            svg.setAttribute('viewBox', `${-options.paddingLeft} ${-options.paddingTop} ${viewBoxWidth} ${viewBoxHeight}`);

            if (options.format === 'png') {
                svg.setAttribute('width', `${options.width}px`);
                svg.setAttribute('height', `${options.height}px`);
            }

            return rasterizeAllImagesToDataURL(svg)
            .then(() => insertCustomFonts(svg))
            .then(() => {
                const svgCode = new XMLSerializer().serializeToString(svg);
                if (options.format === 'png') {
                    return svgToImage(svgCode, options);
                } else {
                    return `data:image/svg+xml;base64,${encode(svgCode)}`;
                }
            });
        }
    };
}

export function exportEntireSvgPlotAsImageData(editorId, x, y, width, height, imageWidth, imageHeight, backgroundColor) {
    const svgMainElement = document.getElementById(`svg-plot-${editorId}`).cloneNode(true);
    const innerHTML = svgMainElement.innerHTML;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.innerHTML = innerHTML;
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('xmlns:xhtml', "http://www.w3.org/1999/xhtml");
    svg.setAttribute('xmlns:xlink', "http://www.w3.org/1999/xlink");
    const viewBoxWidth = width;
    const viewBoxHeight = height;
    svg.setAttribute('viewBox', `${x} ${y} ${viewBoxWidth} ${viewBoxHeight}`);

    svg.setAttribute('width', `${imageWidth}px`);
    svg.setAttribute('height', `${imageHeight}px`);
    svg.querySelector('g[data-type="scene-transform"]').removeAttribute('transform');


    processSvgElementsForExport(svg);

    return rasterizeAllImagesToDataURL(svg)
    .then(() => insertCustomFonts(svg))
    .then(() => {
        const svgCode = new XMLSerializer().serializeToString(svg);
        return svgToImageData(svgCode, {
            width: imageWidth,
            height: imageHeight,
            paddingTop: 0,
            paddingLeft: 0,
            paddingBottom: 0,
            paddingRight: 0,
            backgroundColor: backgroundColor
        });
    });
}

/**
 * @param {ChildNode} node
 * @param {Set<String>} fonts
 * @returns {Set<String>}
 */
function collectAllUsedFonts(node, fonts) {
    if (!fonts) {
        fonts = new Set();
    }

    if (node.nodeName.toLowerCase() === 'div') {
        const fontFamily = node.style.fontFamily;
        if (fontFamily) {
            fonts.add(fontFamily.replaceAll(/("|')/g, ''));
        }
    }
    node.childNodes.forEach(childNode => collectAllUsedFonts(childNode, fonts));
    return fonts;
}

function insertCustomFonts(svg) {
    const allFonts = collectAllUsedFonts(svg);

    const fontPromises = [];
    allFonts.forEach(font => {
        if (fontMapping[font]) {
            fontPromises.push(axios.get(fontMapping[font]));
        }
    });

    return Promise.all(fontPromises)
    .then(fontResponses => {
        fontResponses.forEach(fontResponse => {
            const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            defs.innerHTML = '<style>\n' + fontResponse.data + '\n</style>';
            svg.prepend(defs);
        });
    })
    .catch(err => {
        console.error(err);
    });
}

/**
 * Exports specified svg code as png image
 * @param {String} svgHtml outer HTML of SVG element
 * @param {DiagramExporterOptions} options
 */
function svgToImage(svgHtml, options) {
    return new Promise((resolve, reject) => {
        const svgDataUrl = `data:image/svg+xml;base64,${encode(svgHtml)}`;
        const canvas = document.createElement('canvas');
        canvas.width = options.width;
        canvas.height = options.height;

        const ctx = canvas.getContext('2d');
        const img = new Image;

        img.onload = () => {
            if (options.backgroundColor) {
                ctx.fillStyle = options.backgroundColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            ctx.drawImage(img, options.paddingLeft, options.paddingTop);
            resolve(canvas.toDataURL('image/png'));
        };
        img.src = svgDataUrl;

        img.onerror = (err) => reject(err);
    });
}

/**
 * Exports specified svg code as ImageData
 * @param {String} svgHtml outer HTML of SVG element
 * @param {DiagramExporterOptions} options
 * @returns {ImageData}
 */
function svgToImageData(svgHtml, options) {
    return new Promise((resolve, reject) => {
        const svgDataUrl = `data:image/svg+xml;base64,${encode(svgHtml)}`;
        const canvas = document.createElement('canvas');
        canvas.width = options.width;
        canvas.height = options.height;

        const ctx = canvas.getContext('2d');
        const img = new Image;

        img.onload = () => {
            if (options.backgroundColor) {
                ctx.fillStyle = options.backgroundColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            ctx.drawImage(img, options.paddingLeft, options.paddingTop);
            resolve(ctx.getImageData(0, 0, options.width, options.height));
        };
        img.src = svgDataUrl;

        img.onerror = (err) => reject(err);
    });
}
