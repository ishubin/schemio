import forEach from "lodash/forEach";
import AnimationFunctions from "../animations/functions/AnimationFunctions";
import { getCapTypes } from "../components/editor/items/shapes/ConnectorCaps";
import Shape from "../components/editor/items/shapes/Shape";
import StrokePattern from "../components/editor/items/StrokePattern";
import { getEffects } from "../components/effects/Effects";
import Functions from "../userevents/functions/Functions";


const baseSchema = {
    type: 'object',
    patching: ['modify'],
    fields: {
        name       : { type: 'string', patching: ['patch-text', 'replace'], },
        description: { type: 'string', patching: ['patch-text'] },
        tags       : {type: 'array', of: 'string', patching: ['patch-set']},
        style      : {type: 'object', patching: ['modify'], fields: {
            backgroundColor   : {type: 'string', patching: ['replace']},
            gridColor         : {type: 'string', patching: ['replace']},
            boundaryBoxColor  : {type: 'string', patching: ['replace']},
            controlPointsColor: {type: 'string', patching: ['replace']},
            itemMarkerColor   : {type: 'string', patching: ['replace']},
            itemMarkerToggled : {type: 'boolean', patching: ['replace']}
        }},
        settings: {type: 'object', patching: ['modify'], fields: {
            screen: {type: 'object', patching: ['modify'], fields: {
                draggable: {type: 'boolean', patching: ['replace']}
            }},
        }},
        items: {
            type: 'array', of: 'object',
            patching: ['patch-id-array'],
            childrenField: 'childItems',
            fields: {
                id               : {type: 'string'},
                name             : {type: 'string', patching: ['patch-text', 'replace'], },
                description      : {type: 'string', patching: ['patch-text'] },
                opacity          : {type: 'number', min: 0, max: 100, patching: ['replace']},
                selfOpacity      : {type: 'number', min: 0, max: 100, patching: ['replace']},
                visible          : {type: 'boolean', patching: ['replace']},
                blendMode        : {type: 'string', patching: ['replace']},
                cursor           : {type: 'string', patching: ['replace']},
                clip             : {type: 'boolean', patching: ['replace']},
                interactionMode  : {type: 'string', patching: ['replace']},
                shape            : {type: 'string', patching: ['replace']},
                tooltipBackground: {type: 'string', patching: ['replace']},
                tooltipColor     : {type: 'string', patching: ['replace']},
                tags             : {type: 'array', of: 'string', patching: ['patch-set']},
                args             : {type: 'map', patching: ['patch-map'], fields: {
                    '*': {patching: ['replace']},
                }},
                area             : {type: 'object', patching: ['modify'], fields: {
                    x : {type: 'number', patching: ['replace']},
                    y : {type: 'number', patching: ['replace']},
                    w : {type: 'number', patching: ['replace']},
                    h : {type: 'number', patching: ['replace']},
                    r : {type: 'number', patching: ['replace']},
                    px: {type: 'number', patching: ['replace']},
                    py: {type: 'number', patching: ['replace']},
                    sx: {type: 'number', patching: ['replace']},
                    sy: {type: 'number', patching: ['replace']},
                }},
                links: {type: 'array', of: 'object', patching: ['patch-array'], fields: {
                    title: {type: 'string', patching: ['replace']},
                    url  : {type: 'string', patching: ['replace']},
                    type : {type: 'string', patching: ['replace']}
                }},
                textSlots: {type: 'map', patching: ['patch-map'], fields: {
                    text         : {type: 'string', patching: ['patch-text']},
                    color        : {type: 'string', patching: ['replace']},
                    halign       : {type: 'string', patching: ['replace']},
                    valign       : {type: 'string', patching: ['replace']},
                    fontSize     : {type: 'number', min: 0, patching: ['replace']},
                    whiteSpace   : {type: 'string', patching: ['replace']},
                    font         : {type: 'string', patching: ['replace']},
                    paddingLeft  : {type: 'number', min: 0, patching: ['replace']},
                    paddingRight : {type: 'number', min: 0, patching: ['replace']},
                    paddingTop   : {type: 'number', min: 0, patching: ['replace']},
                    paddingBottom: {type: 'number', min: 0, patching: ['replace']}
                }},
                behavior: {type: 'object', patching: ['modify'], fields: {
                    events: {type: 'array', of: 'object', patching: ['patch-id-array'], fields: {
                        id   : {type: 'string'},
                        event: {type: 'string', patching: ['replace']},
                        actions: {type: 'array', of: 'object', patching: ['patch-id-array'], fields: {
                            id     : {type: 'string'},
                            element: {type: 'string', patching: ['replace']},
                            method : {type: 'string', patching: ['replace']},
                            on     : {type: 'boolean', patching: ['replace']},
                            args   : {type: 'conditional', contidionalParentField: 'method', conditions: [ /* dynamically built */]}
                        }}
                    }}
                }},
                shapeProps     : {type: 'conditional', contidionalParentField: 'shape', conditions: [ /* dynamically built */]},
                effects: {type: 'array', of: 'object', patching: ['patch-id-array'], fields: {
                    id    : {type: 'string'},
                    effect: {type: 'string', patching: ['replace']},
                    name  : {type: 'string', patching: ['patch-text', 'replace']},
                    args  : {type: 'conditional', contidionalParentField: 'effect', conditions: [ /* dynamically built */]}
                }}
            }
        }
    }
};

function buildConditionsForAnimationFunctions() {
    const conditions = [];

    forEach(AnimationFunctions, (funcDef, functionId) => {
        const funcFields = {};
        forEach(funcDef.args, (argDef, argName) => {
            funcFields[argName] = createFieldSchemaForArg(argDef);
        });
        conditions.push({
            on: functionId, type: 'object', patching: ['modify'], fields: funcFields
        });
    })
    return conditions;
}

const schemaForShapeArgType = {
    string          : {type: 'string', patching: ['replace']},
    text            : {type: 'string', patching: ['replace']},
    image           : {type: 'string', patching: ['replace']},
    color           : {type: 'string', patching: ['replace']},
    object          : {type: 'object', patching: ['replace']},
    'advanced-color': {type: 'object', patching: ['replace']},
    boolean         : {type: 'boolean', patching: ['replace']},
    number          : {type: 'number', patching: ['replace']},
    choice          : {type: 'string', patching: ['replace']},
    'stroke-pattern': {type: 'string', patching: ['replace']},
    'path-cap'      : {type: 'string', patching: ['replace']},
    'scheme-ref'    : {type: 'string', patching: ['replace']},
    'color-matrix'  : {type: 'array', patching: ['replace']},
    element         : {type: 'string', patching: ['replace']},
    'crop-area'     : {type: 'object', patching: ['modify'], fields: {
        x: {type: 'number', patching: ['replace']},
        y: {type: 'number', patching: ['replace']},
        w: {type: 'number', patching: ['replace']},
        h: {type: 'number', patching: ['replace']}
    }},
    'custom'        : {type: 'any', patching: ['replace']},
};

function createFieldSchemaForArg(argDef) {
    let schema = {type: null, patching: ['replace']};

    const knownType = schemaForShapeArgType[argDef.type];
    if (knownType) {
        schema.type = knownType.type;
        schema.patching = knownType.patching;
    }

    if (argDef.type === 'number' && argDef.hasOwnProperty('min')) {
        schema.min = argDef.min;
    }
    if (argDef.type === 'number' && argDef.hasOwnProperty('max')) {
        schema.max = argDef.max;
    }
    if (argDef.type === 'choice' && argDef.options) {
        schema.validation = 'choice';
        schema.validValues = argDef.options;
    }
    if (argDef.type === 'stroke-pattern') {
        schema.validation = 'choice';
        schema.validValues = StrokePattern.patterns;
    }
    if (argDef.type === 'path-cap') {
        schema.validation = 'choice';
        schema.validValues = getCapTypes();
    }
    if (argDef.type === 'path-array') {
        schema = {type: 'array', of: 'object', patching: ['patch-id-array'], fields: {
            id    : {type: 'string'},
            closed: {type: 'boolean', patching: ['replace']},
            points: {type: 'array', of: 'object', patching: ['patch-array'], fields: {
                t : {type: 'string'},
                x : {type: 'number'},
                y : {type: 'number'},
                x1: {type: 'number'},
                y1: {type: 'number'},
                x2: {type: 'number'},
                y2: {type: 'number'},
                h : {type: 'number'},
            }},
            pos: {type: 'string', patching: ['replace']}
        }};
    }
    if (argDef.type === 'path-points') {
        schema = {type: 'array', of: 'object', patching: ['patch-array'], fields: {
            x : {type: 'number'},
            y : {type: 'number'},
        }};
    }
    if (argDef.type === 'animations') {
        schema = {type: 'array', patching: ['patch-id-array'], fields: {
            kind    : {type: 'string', patching: ['replace'] },
            property: {type: 'string', patching: ['replace'] },
            frames  : {type: 'array', patching: ['patch-array'], fields: {
                frame: {type: 'number', min: 0 },
                kind : {type: 'string' },
                value: {type: 'any'}
            }}
        }};
    }
    if (argDef.type === 'animation-functions') {
        schema = {type: 'map', patching: ['patch-map'], fields: {
            functionId: {type: 'string', patching: ['replace']},
            args: {type: 'conditional', contidionalParentField: 'functionId', conditions: buildConditionsForAnimationFunctions()}
        }};
    }
    if (argDef.type === 'animation-sections') {
        schema = {type: 'array', of: 'object', patching: ['patch-array'], fields: {
            frame: {type: 'number'},
            value: {type: 'string'},
            kind : {type: 'string'}
        }}
    }
    return schema;
}

function buildFieldConditionsFor(entries) {
    const conditions = [];
    forEach(entries, (effect, name) => {
        const fields = {};

        forEach(effect.args, (argDef, name) => {
            fields[name] = createFieldSchemaForArg(argDef);
        });
        conditions.push({
            on: name, type: 'object', patching: ['modify'], fields
        });
    });
    return conditions;
}

let _schemioDocSchema = null;
export function getSchemioDocSchema() {
    if (_schemioDocSchema) {
        return _schemioDocSchema;
    }

    const shapePropsConditions = [{
        on: null, type: 'object', patching: ['modify'], fields: { '*': {type: 'any', patching: ['replace']} }
    }]

    Shape.getShapeIds().forEach(shapeId => {
        const shape = Shape.find(shapeId);
        const condition = {on : shapeId, type: 'object', patching: ['modify'], fields: {}};
        forEach(Shape.getShapeArgs(shape), (argDef, name) => {
            condition.fields[name] = createFieldSchemaForArg(argDef);
        })
        shapePropsConditions.push(condition);
    });

    baseSchema.fields.items.fields.shapeProps.conditions = shapePropsConditions;
    baseSchema.fields.items.fields.effects.fields.args.conditions = buildFieldConditionsFor(getEffects());
    baseSchema.fields.items.fields.behavior.fields.events.fields.actions.fields.args.conditions = buildFieldConditionsFor(Functions.main);

    _schemioDocSchema = baseSchema;
    return _schemioDocSchema;
}


/**
 *
 * @param {*} value
 * @param {FieldSchema} schema
 */
export function fieldTypeMatchesSchema(value, schema) {
    if (!schema.type || schema.type ===  'any') {
        return true;
    }
    const type = typeof value;

    if (schema.type === 'array' && Array.isArray(value)) {
        return arrayTypeMatchesSchema(value, schema);
    }
    if (schema.type === type) {
        return true;
    }
    if (schema.type === 'map' && type === 'object') {
        return true;
    }
    return false;
}

/**
 *
 * @param {Array} arr
 * @param {FieldSchema} schema
 */
function arrayTypeMatchesSchema(arr, schema) {
    if (!schema.of) {
        return true;
    }
    let matches = true;
    const itemSchema = {type: schema.of, fields: schema.fields};
    for (let i = 0; i < arr.length && matches; i++) {
        matches = fieldTypeMatchesSchema(arr[0], itemSchema);
    }
    return matches;
}