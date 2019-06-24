import Vue from 'vue';


const shapeReigstry = {
    none: {
        args: {},
        template: `
            <g>
            </g>
        `
    },
    rect: {
        args: {
            strokeColor: {type: 'color', value: 'rgba(0,0,0,1.0)', name: 'Stroke color'},
            strokeSize: {type: 'number', value: 2, name: 'Stroke size'},
            fillColor: {type: 'color', value: 'rgba(255,125,125,0.5)', name: 'Fill color'},
        },
        template: `
            <g>
                <rect x="0" y="0" :width="item.area.w" :height="item.area.h"
                    :data-item-id="item.id"
                    class="item-hoverable"
                    :stroke-width="item.style.strokeSize + \'px\'"
                    :stroke="item.style.strokeColor"
                    :fill="item.style.fillColor"></rect>
            </g>
        `
    },
    ellipse: {
        args: {
            strokeColor: {type: 'color', value: 'rgba(0,0,0,1.0)', name: 'Stroke color'},
            strokeSize: {type: 'number', value: 2, name: 'Stroke size'},
            fillColor: {type: 'color', value: 'rgba(255,125,125,0.5)', name: 'Fill color'},
        },
        template: `
            <g>
                <ellipse :cx="Math.floor(item.area.w / 2)" :cy="Math.floor(item.area.h / 2)" :rx="Math.floor(item.area.w/2)" :ry="Math.floor(item.area.h/2)"
                    :data-item-id="item.id"
                    class="item-hoverable"
                    :stroke="item.style.strokeColor"
                    :stroke-width="item.style.strokeSize + 'px'"
                    :fill="item.style.fillColor"
                />
            </g>
        `
    }
};

/**
 * Generates a component and returns it's name
 * @param {string} encodedShape - an encoded JSON that represents a shape or a name of a in-buit shape: e.g. 'rect', 'ellipse'
 */
function make(encodedShape) {
    if (shapeReigstry[encodedShape]) {
        const shape = shapeReigstry[encodedShape];

        if (!shape.vueComponentName) {
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
    make
};