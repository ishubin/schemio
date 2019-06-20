<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <g>
        <component v-if="shapeComponent" :is="shapeComponent" :item="item"></component>
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
            oldShape: this.item.shape
        };
    },

    methods: {
        switchShape(shape) {
            this.oldShape = this.item.shape;
            this.shapeComponent = Shape.make(shape).vueComponentName;
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

