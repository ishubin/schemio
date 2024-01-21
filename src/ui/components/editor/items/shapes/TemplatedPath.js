

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

import myMath from "../../../../myMath";
import { compileJSONTemplate } from "../../../../templater/templater";
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

            controlPoints: createControlPoints(shapeConfig.init, shapeConfig.controlPoints),

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

/**
 * @typedef {Object} TemplatedControlPoint
 * @property {String} id - id of the control point
 * @property {String} updates - the name of the field in item.shapeProps that this control point effects
 * @property {Number} min - minimum value of the fields that is affected by the control point drag
 * @property {Number} max - maximum value of the fields that is affected by the control point drag
 * @property {Point} start - the starting point of the control point that corresponds to min value
 * @property {Point} end - the ending point of the control point that corresponds to max value
 */

function createControlPoints(initBlock, controlPointTemplates) {
    const processor = compileJSONTemplate({
        '$-eval': initBlock || [],
        controlPoints: controlPointTemplates || []
    });

    const renderControlPoints = (item) => {
        return processor(createTemplateData(item)).controlPoints;
    };

    return {
        make(item) {
            const controlPoints = {};
            const cpDefs = renderControlPoints(item);
            cpDefs.forEach(cpDef => {
                const value = myMath.clamp(item.shapeProps[cpDef.updates], cpDef.min, cpDef.max);
                const t = (value - cpDef.min) / (cpDef.max - cpDef.min);

                controlPoints[cpDef.id] = {
                    x: cpDef.start.x * (1 - t) + cpDef.end.x * t,
                    y: cpDef.start.y * (1 - t) + cpDef.end.y * t,
                };
            });
            return controlPoints;
        },
        handleDrag(item, controlPointName, originalX, originalY, dx, dy) {
            const cpDefs = renderControlPoints(item);
            const cpDef = cpDefs.find(cpDef => cpDef.id === controlPointName);
            if (!cpDef) {
                return;
            }

            const vx = cpDef.end.x - cpDef.start.x;
            const vy = cpDef.end.y - cpDef.start.y;
            const x = originalX + dx - cpDef.start.x;
            const y = originalY + dy - cpDef.start.y;
            const projection = Math.abs(myMath.projectVectorToVector(x, y, vx, vy));
            const dSquared = vx*vx + vy*vy;
            if (myMath.tooSmall(dSquared)) {
                return;
            }

            const t = myMath.clamp(projection / Math.sqrt(dSquared), 0, 1);
            item.shapeProps[cpDef.updates] = cpDef.min * (1 - t) + cpDef.max * t;
        }
    }
}

function createGetPinsFunc(initBlock, pinTemplates) {
    if (!Array.isArray(pinTemplates)) {
        return null;
    }

    const processor = compileJSONTemplate({
        '$-eval': initBlock || [],
        pins: pinTemplates
    });

    return (item) => {
        const processed = processor(createTemplateData(item));

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

    const processor = compileJSONTemplate({
        '$-eval': initBlock || [],
        obj: obj
    });

    return (item) => {
        const processed = processor(createTemplateData(item));
        return processed.obj;
    };
}

function createComputePathsFunc(initBlock, pathTemplates) {
    const processor = compileJSONTemplate({
        '$-eval': initBlock || [],
        pathTemplates
    });

    return (item) => {
        if (!Array.isArray(pathTemplates)) {
            return [];
        }

        const processed = processor(createTemplateData(item));

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
    const processor = compileJSONTemplate({
        '$-eval': initBlock || [],
        outlines
    });

    return (item) => {
        if (!Array.isArray(outlines)) {
            return [];
        }
        const processed = processor(createTemplateData(item));

        processed.outlines.forEach(path => {
            path.points = path.points.map(point => convertCurvePointToRelative(point, item.area.w, item.area.h));
        });
        return convertRawPathShapeForRender(item, processed.outlines);
    };
}