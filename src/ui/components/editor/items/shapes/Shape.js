import Vue from 'vue';
import NoneShape from './NoneShape.js';
import Rect from './Rect.js';
import Overlay from './Overlay.vue';
import Ellipse from './Ellipse.js';
import Link from './Link.vue';
import ImageShape from './Image.vue';
import Curve from './Curve.vue';
import Connector from './Connector.vue';
import Comment from './Comment.js';
import FramePlayer from './FramePlayer.vue';
import CodeBlock from './CodeBlock.vue';
import Button from './Button.vue';
import NPoly from './NPoly.js';
import Bracket from './Bracket.js';
import Dummy from './Dummy.vue';
import HUD from './HUD.vue';
import UMLObject from './uml/UMLObject.js';
import UMLModule from './uml/UMLModule.js';
import UMLPackage from './uml/UMLPackage.js';
import UMLNode from './uml/UMLNode.js';
import UMLActor from './uml/UMLActor.vue';
import UMLDatabase from './uml/UMLDatabase.js';
import UMLStart from './uml/UMLStart.js';
import UMLInput from './uml/UMLInput.js';
import UMLDecision from './uml/UMLDecision.js';
import UMLDocument from './uml/UMLDocument.js';
import mapValues from 'lodash/mapValues';
import keys from 'lodash/keys';
import myMath from '../../../../myMath.js';


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
        computeOutline          : shapeConfig.computeOutline || shapeConfig.computePath,
        readjustItem            : shapeConfig.readjustItem,
        getTextSlots            : shapeConfig.getTextSlots || defaultGetTextSlots,
        getEvents               : shapeConfig.getEvents || defaultGetEventsFunc,
        controlPoints           : shapeConfig.controlPoints || null,

        // used for generating item snapers which are used for snapping dragged item to other items
        getSnappers             : shapeConfig.getSnappers || defaultGetSnappers,
        vueComponent            : shapeConfig.shapeType === 'vue'? shapeComponent: null,

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

const shapeRegistry = mapValues({
    none: NoneShape,
    rect: Rect,
    ellipse: Ellipse,
    overlay: Overlay,
    comment: Comment,
    frame_player: FramePlayer,
    image: ImageShape,
    curve: Curve,
    connector: Connector,
    link: Link,
    npoly: NPoly,
    bracket: Bracket,
    button: Button,
    dummy: Dummy,
    hud: HUD,
    uml_object: UMLObject,
    uml_module: UMLModule,
    uml_package: UMLPackage,
    uml_node: UMLNode,
    uml_actor: UMLActor,
    uml_start: UMLStart,
    uml_input: UMLInput,
    uml_decision: UMLDecision,
    uml_document: UMLDocument,
    uml_database: UMLDatabase,
    code_block: CodeBlock
}, enrichShape);

/**
 * Generates a component and returns it's name
 * @param {string} encodedShape - an encoded JSON that represents a shape or a name of a in-buit shape: e.g. 'rect', 'ellipse'
 */
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

export default {
    make,
    getShapeIds() {
        return keys(shapeRegistry);
    },
    find(id) {
        return shapeRegistry[id];
    },
    standardShapeProps,
    getShapePropDescriptor
};
