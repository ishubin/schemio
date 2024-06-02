/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { defaultItemDefinition, defaultTextSlotProps, STANDARD_SHAPE_PROPS } from "./Item";
import Shape from "../components/editor/items/shapes/Shape";
import shortid from 'shortid';
import { enrichObjectWithDefaults } from "../../defaultify";
import { convertCurvePointToRelative } from '../components/editor/items/shapes/StandardCurves.js';
import Functions from '../userevents/functions/Functions.js';
import {forEach} from '../collections';
import utils from "../utils";


function idFixer(obj) {
    if (!obj.id) {
        obj.id = shortid.generate();
    }
}

function enrichItemWithStandardShapeProps(item) {
    enrichObjectWithDefaults(item.shapeProps, STANDARD_SHAPE_PROPS);
}

/**
 *
 * @param {*} action
 * @returns {Boolean} true if action is valid, false if it is not valid. In such case the action will be removed
 */
function fixAndEnrichBehaviorAction(action) {
    idFixer(action);

    if (!action.hasOwnProperty('on')) {
        action.on = true;
    }

    const func = Functions.main[action.method];
    if (!func) {
        return false;
    }
    if (!action.args) {
        action.args = {};
    }

    forEach(func.args, (arg, argName) => {
        if (!action.args.hasOwnProperty(argName)) {
            action.args[argName] = arg.value;
        }
    });
    forEach(action.args, (arg, argName) => {
        if (!func.args.hasOwnProperty(argName)) {
            delete action.args[argName];
        }
    })
    return true;
}

function fixAndEnrichBehaviorEvents(behavior) {
    forEach(behavior.events, event => {
        idFixer(event);

        forEach(event.actions, fixAndEnrichBehaviorAction);

        for (let i = event.actions.length - 1; i >= 0; i--) {
            if (!fixAndEnrichBehaviorAction(event.actions[i])) {
                event.actions.splice(i, 1);
            }
        }
    });
}
/**
 * This function is needed since curves were changed to support multiple paths in a single curve item
 * Also the shape id changed from "curve" to "path"
 * @param {*} item
 */
function fixOldCurveItem(item) {
    item.shape = 'path';
    if (!Array.isArray(item.shapeProps.paths) && Array.isArray(item.shapeProps.points)) {
        item.shapeProps.paths = [{
            points: item.shapeProps.points,
            closed: item.shapeProps.closed
        }];
        delete item.shapeProps.points;
        delete item.shapeProps.closed;
    }
}


function fixPath(item) {
    if (Array.isArray(item.shapeProps.paths)) {
        item.shapeProps.paths.forEach(path => {
            if (!path.id) {
                path.id = shortid.generate();
            }
            if (!Array.isArray(path.points)) {
                path.points = [];
            }
            if (path.pos !== 'relative') {
                path.pos = 'relative';
                path.points = path.points.map(point =>{
                    return convertCurvePointToRelative(point, item.area.w, item.area.h);
                });
            }
            path.points.forEach(p => {
                if (!p.hasOwnProperty('id')) {
                    p.id = shortid.generate();
                }
            });
        });
    }
}

/**
 * Used for backwards compatibilty and it merges "groups" array with "tags"
 */
function fixOldGroups(item) {
    if (Array.isArray(item.groups)) {
        const tags = new Set(item.groups);
        if (Array.isArray(item.tags)) {
            item.tags.forEach(tag => tags.add(tag));
        }
        item.tags = Array.from(tags);

        delete item.groups;
    }
}

function fixFramePlayer(item) {
    if (!item.shapeProps){
        item.shapeProps = {};
    }
    if (!Array.isArray(item.shapeProps.animations)) {
        item.shapeProps.animations = [];
    }
    item.shapeProps.animations.forEach(animation => {
        if (animation.kind === 'item') {
            if (!animation.hasOwnProperty('itemId')) {
                animation.itemId = animation.id;
                animation.id = shortid.generate();
            }
            if (!animation.hasOwnProperty('id')) {
                animation.id = shortid.generate();
            }
        } else if (animation.kind === 'function') {
            if (!animation.hasOwnProperty('funcId')) {
                animation.funcId = animation.id;
                animation.id = shortid.generate();
            }
            if (!animation.hasOwnProperty('id')) {
                animation.id = shortid.generate();
            }
        }
    });
}

/**
 * Checks all shapeProps args of the item if they match its shape and removes the unknown args
 * @param {Item} item
 */
export function cleanupShapeProps(item) {
    const shape = Shape.find(item.shape);
    if (!shape) {
        return;
    }
    const knownShapeArgs = Shape.getShapeArgs(shape);

    forEach(item.shapeProps, (arg, argName) => {
        if (!knownShapeArgs.hasOwnProperty(argName)) {
            delete item.shapeProps[argName];
        }
    });
}

export function fixConnectorItem(item) {
    if (!item.shapeProps || !Array.isArray(item.shapeProps.points)) {
        return;
    }

    item.shapeProps.points.forEach(p => {
        if (!p.hasOwnProperty('id')) {
            p.id = shortid.generate();
        }
        if (p.hasOwnProperty('bx') || p.hasOwnProperty('by')) {
            p.nx = p.bx;
            p.ny = p.by;
            delete p.bx;
            delete p.by;
        }
    });
}

export function enrichItemWithDefaults(item) {
    if (!item.textSlots)  {
        item.textSlots = {};
    }

    if (!item.shape) {
        item.shape = 'none';
    }

    if (!item.meta) {
        item.meta = {
            strokeOffset: 0
        };
    }

    // fixing old documents before curves were moved into multi-path shapes
    if (item.shape === 'curve') {
        fixOldCurveItem(item);
    }
    if (item.shape === 'connector') {
        fixConnectorItem(item);
    }
    if (item.shape === 'path') {
        fixPath(item);
    }
    if (item.shape === 'frame_player') {
        fixFramePlayer(item);
    }

    enrichObjectWithDefaults(item, defaultItemDefinition);

    fixOldGroups(item);
    fixAndEnrichBehaviorEvents(item.behavior);
    forEach(item.links, idFixer);

    let shape = Shape.find(item.shape);
    if (!shape) {
        return;
    }

    if (!item.shapeProps) {
        item.shapeProps = {};
    }

    if (shape.fixItem) {
        shape.fixItem(item);
    }

    forEach(item.shapeProps, (value, argName) => {
        if (!shape.args || !shape.args.hasOwnProperty(argName)) {
            delete item.shapeProps[argName];
        }
    });

    forEach(shape.args, (arg, argName) => {
        if (!item.shapeProps.hasOwnProperty(argName)) {
            item.shapeProps[argName] = utils.clone(arg.value);
        } else if (typeof item.shapeProps[argName] === 'object') {
            enrichObjectWithDefaults(item.shapeProps[argName], shape.args[argName].value);
        }
    });

    if (shape.shapeType === 'standard') {
        enrichItemWithStandardShapeProps(item);
    }

    // Some getTextSlots functions in some shapes rely on specific fields in shapeProps
    // that is why it is important to enrich all shapeProps before we call getTextSlots function
    const textSlots = shape.getTextSlots(item);
    if (textSlots) {
        forEach(textSlots, textSlot => {
            if (!item.textSlots.hasOwnProperty(textSlot.name)) {
                item.textSlots[textSlot.name] = {};
                enrichItemTextSlotWithDefaults(item.textSlots[textSlot.name]);
            }
        });
    }
}

export function enrichItemTextSlotWithDefaults(textSlot) {
    return enrichObjectWithDefaults(textSlot, defaultTextSlotProps);
}


export function enrichItemWithDefaultShapeProps(item) {
    const shape = Shape.find(item.shape);
    if (!shape) {
        return;
    }
    if (shape.args) {
        if (!item.shapeProps) {
            item.shapeProps = {};
        }
        forEach(shape.args, (shapeArg, shapeArgName) => {
            if (!item.shapeProps.hasOwnProperty(shapeArgName)) {
                item.shapeProps[shapeArgName] = shapeArg.value;
            }
        });
    }
}
