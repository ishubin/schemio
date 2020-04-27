<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <g :transform="`translate(${item.area.x},${item.area.y}) rotate(${item.area.r})`"
        :style="{'opacity': item.opacity/100.0, 'mix-blend-mode': item.blendMode}"
    >

        <component
            :key="`item-component-${item.id}-${item.shape}`"
            v-if="shapeComponent && item.visible"
            :is="shapeComponent"
            :item="item"
            :style="{'opacity': item.selfOpacity/100.0}"
            :hidden-text-property="hiddenTextProperty"
            @custom-event="onShapeCustomEvent">
        </component>

        <g :id="`animation-container-${item.id}`"></g>

        <path v-if="itemSvgPath && shouldDrawEventLayer"
            :id="`item-svg-path-${item.id}`"
            :d="itemSvgPath" 
            :data-item-id="item.id"
            :stroke-width="hoverPathStrokeWidth"
            :style="{'cursor': item.cursor}"
            stroke="rgba(255, 255, 255, 0)"
            :fill="hoverPathFill" />

        <g v-if="item.childItems && item.visible">
            <item-svg v-for="childItem in item.childItems"
                v-if="childItem.visible"
                :key="`${childItem.id}-${childItem.shape}-${schemeContainer.revision}`"
                :item="childItem"
                :mode="mode"
                :scheme-container="schemeContainer"
                @custom-event="$emit('custom-event', arguments[0])"
                />
        </g>    

    </g>
</template>

<script>
import Shape from './shapes/Shape.js';
import EventBus from '../EventBus.js';
import myMath from '../../../myMath';


export default {
    name: 'item-svg',
    props: ['item', 'mode', 'schemeContainer'],

    mounted() {
        this.switchShape(this.item.shape);
        EventBus.subscribeForItemChanged(this.item.id, this.onItemChanged);
    },

    beforeDestroy() {
        EventBus.unsubscribeForItemChanged(this.item.id, this.onItemChanged);
    },

    data() {
        return {
            shapeComponent        : null,
            oldShape              : this.item.shape,
            itemSvgPath           : null,
            hiddenTextProperty    : this.item.meta.hiddenTextProperty || null,
            shouldDrawEventLayer  : true
        };
    },

    methods: {
        switchShape(shapeId) {
            this.oldShape = this.item.shape;
            const shape = Shape.make(shapeId);
            if (shape.editorProps && shape.editorProps.ignoreEventLayer && this.mode === 'view') {
                this.shouldDrawEventLayer = false;
            }
            if (shape.component) {
                this.shapeComponent = shape.component;
                this.itemSvgPath = shape.component.computePath(this.item);
            } else {
                this.shapeComponent = shape.vueComponentName;
            }
        },

        onItemChanged() {
            if (this.oldShape !== this.item.shape) {
                this.switchShape(this.item.shape);
            }
            // refreshing the state of text display. This is needed when text edit is triggered for item with double click
            this.hiddenTextProperty = this.item.meta.hiddenTextProperty || null;
            this.$forceUpdate();
        },

        onShapeCustomEvent(eventName, ...args) {
            this.$emit('custom-event', {
                itemId: this.item.id,
                eventName: eventName,
                args: arguments
            });
        }
    },

    computed: {
        hoverPathStrokeWidth() {
            if (this.item.shape === 'curve') {
                return (parseInt(this.item.shapeProps.strokeSize) + 2)  + 'px';
            }
            return '0px';
        },
        hoverPathFill() {
            if (this.item.shape === 'curve' && !this.item.shapeProps.fill) {
                return 'none';
            }
            return 'rgba(255, 255, 255, 0)';
        }
    }
}
</script>

