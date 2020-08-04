import Vue from 'vue';
import NoneShape from './NoneShape.vue';
import Rect from './Rect.vue';
import Overlay from './Overlay.vue';
import Ellipse from './Ellipse.vue';
import Link from './Link.vue';
import Curve from './Curve.vue';
import CommentShape from './CommentShape.vue';
import FramePlayer from './FramePlayer.vue';
import CodeBlock from './CodeBlock.vue';
import Button from './Button.vue';
import NPolygon from './NPolygon.vue';
import Bracket from './Bracket.vue';
import UMLObject from './uml/UMLObject.vue';
import UMLModule from './uml/UMLModule.vue';
import UMLPackage from './uml/UMLPackage.vue';
import UMLNode from './uml/UMLNode.vue';
import _ from 'lodash';



function defaultGetEventsFunc(item) {
    return [];
}

const defaultEditorProps = {
    description: 'rich',
    text: 'rich'
};

function defaultGetTextSlots(item) {
    return [{
        name: 'body',
        area: {x: 0, y: 0, w: item.area.w, h: item.area.h}
    }, {
        name: 'above',
        area: {x: 0, y: -item.area.h, w: item.area.w, h: item.area.h}
    }, {
        name: 'below',
        area: {x: 0, y: item.area.h, w: item.area.w, h: item.area.h}
    }, {
        name: 'left of',
        area: {x: -item.area.w, y: 0, w: item.area.w, h: item.area.h}
    }, {
        name: 'right of',
        area: {x: item.area.w, y: 0, w: item.area.w, h: item.area.h}
    }];
}

function enrichShape(shapeComponent) {
    return {
        editorProps             : shapeComponent.editorProps || defaultEditorProps,
        args                    : shapeComponent.args,
        computePath             : shapeComponent.computePath,
        readjustItem            : shapeComponent.readjustItem,
        getTextSlots            : shapeComponent.getTextSlots || defaultGetTextSlots,
        getEvents               : shapeComponent.getEvents || defaultGetEventsFunc,
        controlPoints           : shapeComponent.controlPoints || null,
        component               : shapeComponent
    };
}

const shapeReigstry = _.mapValues({
    none: NoneShape,
    rect: Rect,
    ellipse: Ellipse,
    overlay: Overlay,
    comment: CommentShape,
    frame_player: FramePlayer,
    curve: Curve,
    link: Link,
    npoly: NPolygon,
    bracket: Bracket,
    button: Button,
    uml_object: UMLObject,
    uml_module: UMLModule,
    uml_package: UMLPackage,
    uml_node: UMLNode,
    code_block: CodeBlock
}, enrichShape);

/**
 * Generates a component and returns it's name
 * @param {string} encodedShape - an encoded JSON that represents a shape or a name of a in-buit shape: e.g. 'rect', 'ellipse'
 */
function make(encodedShape) {
    if (shapeReigstry[encodedShape]) {
        const shape = shapeReigstry[encodedShape];

        if (!shape.component && !shape.vueComponentName) {
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

export default {
    make,
    shapeReigstry,
    find(id) {
        return shapeReigstry[id];
    }
};
