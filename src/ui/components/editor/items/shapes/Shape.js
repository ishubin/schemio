import Vue from 'vue';
import NoneShape from './NoneShape.vue';
import Rect from './Rect.vue';
import Ellipse from './Ellipse.vue';
import CommentShape from './CommentShape.vue';
import UMLObject from './uml/UMLObject.vue';
import UMLModule from './uml/UMLModule.vue';

function _shape(shapeComponent) {
    return { args: shapeComponent.args, computePath: shapeComponent.computePath, component: shapeComponent };
}

const shapeReigstry = {
    none: _shape(NoneShape),
    rect: _shape(Rect),
    ellipse: _shape(Ellipse),
    comment: _shape(CommentShape),
    uml_object: _shape(UMLObject),
    uml_module: _shape(UMLModule)
};

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
