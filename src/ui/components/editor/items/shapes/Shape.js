import Vue from 'vue';
import Rect from './Rect.vue';
import Ellipse from './Ellipse.vue';


const shapeReigstry = {
    none: {
        args: {},
        template: `
            <g>
            </g>
        `
    },
    rect: { args: Rect.args, component: Rect},
    ellipse: { args: Ellipse.args, component: Ellipse}
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
    find(id) {
        return shapeReigstry[id];
    }
};