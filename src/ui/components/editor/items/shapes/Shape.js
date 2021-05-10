import Vue from 'vue';
import forEach from 'lodash/forEach';
import keys from 'lodash/keys';
import myMath from '../../../../myMath.js';
import { convertStandardCurveShape } from './StandardCurves.js';

const _shapes = [
    require('./Rect.js').default,
    require('./NoneShape.js').default,
    require('./Ellipse.js').default,
    require('./NPoly.js').default,
    require('./Curve.vue').default,
    require('./Connector.vue').default,
    require('./Bracket.js').default,
    require('./Overlay.vue').default,
    require('./Image.vue').default,
    require('./Comment.js').default,
    require('./Link.vue').default,
    require('./FramePlayer.vue').default,
    require('./CodeBlock.vue').default,
    require('./Button.vue').default,
    require('./Dummy.vue').default,
    require('./HUD.vue').default,

    require('./basic/Triangle.js').default,
    require('./basic/Diamond.js').default,

    require('./uml/UMLObject.js').default,
    require('./uml/UMLClass.js').default,
    require('./uml/UMLModule.js').default,
    require('./uml/UMLPackage.js').default,
    require('./uml/UMLNode.js').default,
    require('./uml/UMLStart.js').default,
    require('./uml/UMLInput.js').default,
    require('./uml/UMLDocument.js').default,
    require('./uml/UMLDataflow.js').default,
    require('./uml/UMLDatabase.js').default,
    require('./uml/UMLDelay.js').default,
    require('./uml/UMLPreparation.js').default,
    require('./uml/UMLLoopLimit.js').default,
    require('./uml/UMLNote.js').default,
    require('./uml/UMLSendSignal.js').default,
    require('./uml/UMLReceiveSignal.js').default,
    require('./uml/UMLStorage.js').default,
    require('./uml/UMLProcess.js').default,
    require('./uml/UMLActor.vue').default,
];

const _zeroTransform = {x: 0, y: 0, r: 0};

function defaultGetEventsFunc(item) {
    return [];
}

const defaultEditorProps = {
    description: 'rich',
    onlyEditMode: false,
    ignoreEventLayer: false,
    customTextRendering: false
};

const standardShapeProps = {
    fill         : {name: 'Fill', type: 'advanced-color'},
    strokeColor  : {name: 'Stroke', type: 'color'},
    strokeSize   : {name: 'Stroke Size', type: 'number'},
    strokePattern: {name: 'Stroke Pattern', type: 'stroke-pattern'}
};

function defaultGetTextSlots(item) {
    return [{
        name: 'body',
        area: {x: 0, y: 0, w: item.area.w, h: item.area.h}
    }];
}

function defaultGetPins(item) {
    return [{
        x: item.area.w/2,
        y: item.area.h/2
    }];
}

function worldPointOnItem(x, y, item) {
    return myMath.worldPointInArea(x, y, item.area, (item.meta && item.meta.transform) ? item.meta.transform : _zeroTransform);
}

function defaultGetSnappers(item) {
    const p1 = worldPointOnItem(0, 0, item);
    const p2 = worldPointOnItem(item.area.w, 0, item);
    const p3 = worldPointOnItem(item.area.w, item.area.h, item);
    const p4 = worldPointOnItem(0, item.area.h, item);

    const snappers = [];

    if (item.area.w > 0.0001) {
        if (Math.abs(p1.y - p2.y) < 0.0001) {
            snappers.push({
                item,
                snapperType: 'horizontal',
                value: p1.y
            });
        }
        if (Math.abs(p3.y - p4.y) < 0.0001) {
            snappers.push({
                item,
                snapperType: 'horizontal',
                value: p3.y
            });
        }

        if (Math.abs(p1.x - p4.x) < 0.0001) {
            snappers.push({
                item,
                snapperType: 'vertical',
                value: p1.x
            });
        }
        if (Math.abs(p2.x - p3.x) < 0.0001) {
            snappers.push({
                item,
                snapperType: 'vertical',
                value: p2.x
            });
        }
    }
    return snappers;
}

function enrichShape(shapeComponent, shapeName) {
    let shapeConfig = {};
    if (shapeComponent.shapeConfig) {
        shapeConfig = shapeComponent.shapeConfig;
    }
    if (!shapeConfig.shapeType) {
        console.error(`Missing shapeType for shape "${shapeName}"`);
    }
    return {
        shapeType               : shapeConfig.shapeType,
        editorProps             : shapeConfig.editorProps || defaultEditorProps,
        args                    : shapeConfig.args,
        computePath             : shapeConfig.computePath,
        computeCurves           : shapeConfig.computeCurves,
        computeOutline          : shapeConfig.computeOutline || shapeConfig.computePath,
        readjustItem            : shapeConfig.readjustItem,
        getTextSlots            : shapeConfig.getTextSlots || defaultGetTextSlots,
        getEvents               : shapeConfig.getEvents || defaultGetEventsFunc,
        controlPoints           : shapeConfig.controlPoints || null,
        getPins                 : shapeConfig.getPins || defaultGetPins,

        // used for generating item snapers which are used for snapping dragged item to other items
        getSnappers             : shapeConfig.getSnappers || defaultGetSnappers,
        vueComponent            : shapeConfig.shapeType === 'vue'? shapeComponent: null,

        menuItems               : shapeConfig.menuItems || [],

        argType(argName) {
            if (this.args && this.args[argName]) {
                return this.args[argName].type;
            }
            if (this.shapeType === 'standard') {
                if (standardShapeProps[argName]) {
                    return standardShapeProps[argName].type;
                }
            }
            return null;
        }
    };
}

const shapeRegistry = {};
function registerShape(shape) {
    if (!shape.shapeConfig.id) {
        return;
    }

    if (shape.shapeConfig.shapeType === 'raw') {
        shape = convertStandardCurveShape(shape);
    }

    shapeRegistry[shape.shapeConfig.id] = enrichShape(shape);
    make(shape.shapeConfig.id);
}

forEach(_shapes, registerShape);

/**
 * Generates a component and returns it's name
 * @param {string} encodedShape - an encoded JSON that represents a shape or a name of a in-built shape: e.g. 'rect', 'ellipse'
 */
//TODO remove this function and change all callers of it
function make(encodedShape) {
    if (shapeRegistry[encodedShape]) {
        const shape = shapeRegistry[encodedShape];

        if (!shape.vueComponent && !shape.vueComponentName) {
            const componentName = `${encodedShape}-shape-svg-component`;
            Vue.component(componentName, {
                props: ['item'],
                template: shape.template
            })
            shape.vueComponentName = componentName;
        }
        return shape;
    } else {
        throw new Error('Custom shapes are not yet supported');
    }
}

function getShapePropDescriptor(shape, propName) {
    if (shape.shapeType === 'standard') {
        if (standardShapeProps.hasOwnProperty(propName)) {
            return standardShapeProps[propName];
        }
    }
    if (shape.args && shape.args.hasOwnProperty(propName)) {
        return shape.args[propName];
    }

    return null;
}

function getRegistry() {
    return shapeRegistry;
}

export default {
    make,
    getShapeIds() {
        return keys(shapeRegistry);
    },
    find(id) {
        return shapeRegistry[id];
    },
    standardShapeProps,
    getShapePropDescriptor,
    getRegistry
};
