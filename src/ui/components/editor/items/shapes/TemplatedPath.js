

/**
 * @typedef {Object} TemplatePathShapeConfig
 * @property {String} id
 * @property {String} shapeType
 * @property {String|Array<String>} init
 * @property {Array<Object>} menuItems
 * @property {Object} args
 * @property {Array<Object>} pins
 * @property {Array<Object>} paths
 * @property {Array<Object>} outlines
 * @property {Array<Object>} controlPoints
 * @property {Array<Object>} textSlots
 * */

import { processJSONTemplate } from "../../../../templater/templater";
import { convertCurvePointToRelative, convertRawPathShapeForRender } from "./StandardCurves";

/**
 * @param {TemplatePathShapeConfig} shapeConfig
 */
export function convertTemplatePathShape(shapeConfig) {
    const shapeConfigArgs = shapeConfig.args || {};
    return {
        shapeConfig: {
            id: shapeConfig.id,

            shapeType: 'templated-path',

            menuItems: shapeConfig.menuItems,

            computeOutline: createComputeOutlineFunc(shapeConfig.init, shapeConfig.outlines),

            // raw do not use computePath function but instead they rely on computeCurves function
            // since each curve might have its own fill and stroke
            computeCurves: createComputePathsFunc(shapeConfig.init, shapeConfig.paths),

            getPins: createGetPinsFunc(shapeConfig.init, shapeConfig.pins),
            getTextSlots: createTemplatedFunc(shapeConfig.init, shapeConfig.textSlots),

            args: {
                fill         : {type: 'advanced-color', value: {type: 'solid', color: 'rgba(255,255,255,1)'}, name: 'Fill'},
                strokeColor  : {type: 'color', value: '#111111', name: 'Stroke color'},
                strokePattern: {type: 'stroke-pattern', value: 'solid', name: 'Stroke pattern'},
                strokeSize   : {type: 'number', value: 2, name: 'Stroke Size'},
                ...shapeConfigArgs
            }
        }
    };
}

/**
 *
 * @param {Item} item
 */
function createTemplateData(item) {
    return {
        width: item.area.w,
        height: item.area.h,
        args: item.shapeProps
    };
}

function createGetPinsFunc(initBlock, pinTemplates) {
    if (!Array.isArray(pinTemplates)) {
        return null;
    }

    return (item) => {
        const processed = processJSONTemplate({
            '$-eval': initBlock || [],
            pins: pinTemplates
        }, createTemplateData(item));

        const pins = {};
        processed.pins.forEach(pin => {
            const pinId = pin.id;
            delete pin.id;
            pins[pinId] = pin;
        });
        return pins;
    };
}

function createTemplatedFunc(initBlock, obj) {
    if (!obj) {
        return null;
    }

    return (item) => {
        const processed = processJSONTemplate({
            '$-eval': initBlock || [],
            obj: obj
        }, createTemplateData(item));
        return processed.obj;
    };
}

function createComputePathsFunc(initBlock, pathTemplates) {
    return (item) => {
        if (!Array.isArray(pathTemplates)) {
            return [];
        }

        const processed = processJSONTemplate({
            '$-eval': initBlock || [],
            pathTemplates
        }, createTemplateData(item));

        return processed.pathTemplates.map(path => {
            path.points = path.points.map(point => convertCurvePointToRelative(point, item.area.w, item.area.h));
            const svgPath = convertRawPathShapeForRender(item, [path]);
            return {
                path: svgPath,
                fill: path.fill,
                strokeColor: path.strokeColor,
                strokeSize: path.strokeSize,
                strokePattern: path.strokePattern
            };
        });
    };
}

function createComputeOutlineFunc(initBlock, outlines) {
    return (item) => {
        if (!Array.isArray(outlines)) {
            return [];
        }

        const processed = processJSONTemplate({
            '$-eval': initBlock || [],
            outlines
        }, createTemplateData(item));

        processed.outlines.forEach(path => {
            path.points = path.points.map(point => convertCurvePointToRelative(point, item.area.w, item.area.h));
        });
        return convertRawPathShapeForRender(item, processed.outlines);
    };
}