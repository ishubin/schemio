<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <g :data-item-index="0" :class="{'interactive': this.item.interactive}" :style="{'opacity': item.opacity, 'mix-blend-mode': item.blendMode}">
        <component v-if="shapeComponent && item.visible" :is="shapeComponent" :item="item"></component>

        <path v-if="itemSvgPath" :d="itemSvgPath" 
            :data-item-id="item.id"
            :stroke-width="0 + 'px'"
            stroke="rgba(255, 255, 255, 0)"
            fill="rgba(255, 255, 255, 0)" />
    </g>
</template>

<script>
import Shape from './shapes/Shape.js';


export default {
    props: ['item', 'offsetX', 'offsetY', 'zoom'],

    mounted() {
        this.switchShape(this.item.shape);
    },


    data() {
        return {
            shapeComponent: null,
            oldShape: this.item.shape,
            itemSvgPath: null
        };
    },

    methods: {
        switchShape(shapeId) {
            this.oldShape = this.item.shape;
            const shape = Shape.make(shapeId);
            if (shape.component) {
                this.shapeComponent = shape.component;
                this.itemSvgPath = shape.component.computePath(this.item);
            } else {
                this.shapeComponent = shape.vueComponentName;
            }
        }
    },

    watch: {
        item: {
            deep: true,
            handler(newItem) {
                if (this.oldShape !== newItem.shape) {
                    this.switchShape(newItem.shape);
                }
            }
        }
    }
}
</script>

