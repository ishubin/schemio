<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <g :transform="`translate(${item.area.x},${item.area.y}) rotate(${item.area.r}, ${item.area.w/2}, ${item.area.h/2})`"
    >
        <component
            :key="`item-component-${item.id}-${item.shape}`"
            v-if="shapeComponent && item.visible"
            :is="shapeComponent"
            :item="item"
            :style="{'opacity': item.opacity/100.0, 'mix-blend-mode': item.blendMode}"
            :hidden-text-property="hiddenTextProperty"
            @custom-event="onShapeCustomEvent">
        </component>

        <path v-if="itemSvgPath"
            :id="`item-svg-path-${item.id}`"
            :d="itemSvgPath" 
            :data-item-id="item.id"
            :stroke-width="0 + 'px'"
            :style="{'cursor': item.cursor}"
            stroke="rgba(255, 255, 255, 0)"
            fill="rgba(255, 255, 255, 0)" />

        <g v-if="mode === 'edit'">
            <g class="item-container" data-preview-ignore="true">
                <!-- Drawing boundary edit box -->
                <rect class="boundary-box"
                    :data-item-id="item.id"
                    x="0"
                    y="0"
                    :width="item.area.w"
                    :height="item.area.h"
                />
                <g v-if="selected" v-for="(dragger, draggerIndex) in provideBoundingBoxDraggers()">
                    <ellipse v-if="dragger.rotation" class="boundary-box-dragger rotational-dragger"
                        :data-dragger-item-id="item.id"
                        data-dragger-type="rotation"
                        :cx="dragger.x"
                        :cy="dragger.y"
                        :rx="dragger.s/(zoom || 1.0)"
                        :ry="dragger.s/(zoom || 1.0)"
                    />

                    <rect v-if="!dragger.rotation" class="boundary-box-dragger"
                        :data-dragger-item-id="item.id"
                        :data-dragger-index="draggerIndex"
                        :x="dragger.x - dragger.s / (zoom || 1.0)"
                        :y="dragger.y - dragger.s / (zoom || 1.0)"
                        :width="dragger.s * 2 / (zoom || 1.0)"
                        :height="dragger.s * 2 / (zoom || 1.0)"
                    />
                </g>
            </g>
        </g>

        <g :id="`animation-container-${item.id}`"></g>
    </g>
</template>

<script>
import Shape from './shapes/Shape.js';
import EventBus from '../EventBus.js';


export default {
    props: ['item', 'offsetX', 'offsetY', 'zoom', 'mode', 'schemeContainer'],

    mounted() {
        this.switchShape(this.item.shape);
        EventBus.subscribeForItemChanged(this.item.id, this.onItemChanged);
        EventBus.subscribeForItemSelected(this.item.id, this.onItemSelected);
        EventBus.subscribeForItemDeselected(this.item.id, this.onItemDeselected);
    },

    beforeDestroy() {
        EventBus.unsubscribeForItemChanged(this.item.id, this.onItemChanged);
        EventBus.unsubscribeForItemSelected(this.item.id, this.onItemSelected);
        EventBus.unsubscribeForItemDeselected(this.item.id, this.onItemDeselected);
    },

    data() {
        return {
            shapeComponent: null,
            oldShape: this.item.shape,
            itemSvgPath: null,
            selected: false,
            hiddenTextProperty: this.item.meta.hiddenTextProperty || null
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
        },

        onItemChanged() {
            if (this.oldShape !== this.item.shape) {
                this.switchShape(this.item.shape);
            }
            // refreshing the state of text display. This is needed when text edit is triggered for item with double click
            this.hiddenTextProperty = this.item.meta.hiddenTextProperty || null;
            this.$forceUpdate();
        },

        provideBoundingBoxDraggers() {
            return this.schemeContainer.provideBoundingBoxDraggers(this.item);
        },

        onItemSelected() {
            this.selected = true;
        },

        onItemDeselected() {
            this.selected = false;
        },

        onShapeCustomEvent(eventName, ...args) {
            this.$emit('custom-event', {
                itemId: this.item.id,
                eventName: eventName,
                args: arguments
            });
        }
    }
}
</script>

