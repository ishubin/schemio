import Vue from 'vue';
import NoneShape from './NoneShape.vue';
import Rect from './Rect.vue';
import Ellipse from './Ellipse.vue';
import Link from './Link.vue';
import CommentShape from './CommentShape.vue';
import FramePlayer from './FramePlayer.vue';
import CodeBlock from './CodeBlock.vue';
import UMLObject from './uml/UMLObject.vue';
import UMLModule from './uml/UMLModule.vue';
import UMLPackage from './uml/UMLPackage.vue';
import UMLNode from './uml/UMLNode.vue';
import _ from 'lodash';


/**
 * Used as a fallback in case a particular shape has not speicified identifyTextEditArea function
 * This is needed for handling in-svg text edit on double click
 * @param {SchemeItem} item 
 */
function identifyTextEditAreaFallback(item) {
    return {
        property: 'text',
        style: {}
    };
}

function defaultGetEventsFunc(item) {
    return [];
}

const defaultEditorProps = {
    description: 'rich',
    text: 'rich'
};

function enrichShape(shapeComponent) {
    return {
        editorProps: shapeComponent.editorProps || defaultEditorProps,
        args: shapeComponent.args,
        computePath: shapeComponent.computePath,
        // This function is used when SvgEditor tries to figure out which exact property has user double clicked on
        identifyTextEditArea: shapeComponent.identifyTextEditArea || identifyTextEditAreaFallback,
        getEvents: shapeComponent.getEvents || defaultGetEventsFunc,
        component: shapeComponent
    };
}

const shapeReigstry = _.mapValues({
    none: NoneShape,
    rect: Rect,
    ellipse: Ellipse,
    comment: CommentShape,
    frame_player: FramePlayer,
    link: Link,
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
