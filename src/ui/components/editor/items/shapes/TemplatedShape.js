

import myMath from "../../../../myMath";
import { compileJSONTemplate } from "../../../../templater/templater";
import { convertShapePrimitiveToSvgPath } from "./StandardCurves";

/**
 * @param {TemplatedShapeConfig} shapeConfig
 * @returns {ShapeConfig}
 */
export function convertTemplateShape(shapeConfig) {
    const shapeConfigArgs = shapeConfig.args || {};
    const standardArgs = shapeConfig.includeStandardArgs ? {
        fill         : {type: 'advanced-color', value: {type: 'solid', color: 'rgba(255,255,255,1)'}, name: 'Fill'},
        strokeColor  : {type: 'color', value: '#111111', name: 'Stroke color'},
        strokeSize   : {type: 'number', value: 2, name: 'Stroke Size'},
        strokePattern: {type: 'stroke-pattern', value: 'solid', name: 'Stroke pattern'},
    } : {};

    return {
        shapeConfig: {
            id: shapeConfig.id,

            shapeType: 'templated',

            menuItems: shapeConfig.menuItems,

            computeOutline: createComputeOutlineFunc(shapeConfig.init, shapeConfig.outlines),

            // templated shape does not use computePath function but instead they rely on computePrimitives function
            // since each primitive might have its own fill and stroke
            computePrimitives: createComputePrimitivesFunc(shapeConfig.init, shapeConfig.primitives),

            getPins: createGetPinsFunc(shapeConfig.init, shapeConfig.pins),
            getTextSlots: createTemplatedFunc(shapeConfig.init, shapeConfig.textSlots || []),

            controlPoints: createControlPoints(shapeConfig.init, shapeConfig.controlPoints),

            args: {
                ...standardArgs,
                ...shapeConfigArgs
            },
            editorProps: shapeConfig.editorProps
        }
    };
}

/**
 *
 * @param {Item} item
 */
function createTemplateData(item) {
    return {
        name: item.name,
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

function createComputePrimitivesFunc(initBlock, primitives) {
    const processor = compileJSONTemplate({
        '$-eval': initBlock || [],
        primitives
    });

    /**
     * @param {Item} item
     * @returns {Array<ShapeSVGPrimitive>}
     */
    return (item) => {
        if (!Array.isArray(primitives)) {
            return [];
        }

        const processed = processor(createTemplateData(item));

        return processed.primitives.map(primitive => {
            if (primitive.type === 'text') {
                if (primitive.transformType === 'relative') {
                    const {x, y, w, h} = primitive.area;
                    primitive.area = {
                        x: x * item.area.w / 100,
                        y: y * item.area.h / 100,
                        w: w * item.area.w / 100,
                        h: h * item.area.h / 100,
                    };
                }
                return {
                    type: primitive.type,
                    text: primitive.text || '',
                    fontSize: primitive.fontSize || 12,
                    fontColor: primitive.fontColor || 'rgba(0, 0, 0, 1.0)',
                    area: primitive.area || {x: 0, y: 0, w: item.area.w, h: item.area.h}
                };
            }
            return {
                fill         : primitive.fill || {type: 'none'},
                strokeColor  : primitive.strokeColor || 'rgba(0,0,0,1.0)',
                strokeSize   : primitive.hasOwnProperty('strokeSize') ? primitive.strokeSize : 0,
                strokePattern: primitive.hasOwnProperty('strokePattern') ? primitive.strokePattern: 'solid',
                type         : primitive.type,
                svgPath      : convertShapePrimitiveToSvgPath(item, primitive)
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
            return null;
        }
        const processed = processor(createTemplateData(item));

        let svgPath = '';
        processed.outlines.forEach(outlinePrimitive => {
            const primitiveSvgPath = convertShapePrimitiveToSvgPath(item, outlinePrimitive);
            if (primitiveSvgPath) {
                svgPath += primitiveSvgPath + ' ';
            }
        });
        return svgPath;
    };
}
