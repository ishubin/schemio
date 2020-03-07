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

        <connector-svg  v-for="connector in item.connectors" v-if="connector.meta && item.visible"
            :key="connector.id"
            :sourceItem="item"
            :connector="connector"
            :zoom="schemeContainer.screenTransform.scale"
            :offsetX="schemeContainer.screenTransform.x"
            :offsetY="schemeContainer.screenTransform.y"
            :showReroutes="mode === 'edit'"
            :mode="mode"
            :boundary-box-color="boundaryBoxColor"
            ></connector-svg>


        <g :id="`animation-container-${item.id}`"></g>

        <path v-if="itemSvgPath"
            :id="`item-svg-path-${item.id}`"
            :d="itemSvgPath" 
            :data-item-id="item.id"
            :stroke-width="0 + 'px'"
            :style="{'cursor': item.cursor}"
            stroke="rgba(255, 255, 255, 0)"
            fill="rgba(255, 255, 255, 0)" />

        <rect class="boundary-box"
            v-if="mode === 'edit' && item.visible"
            data-preview-ignore="true"
            :data-item-id="item.id"
            :stroke="schemeContainer.scheme.style.boundaryBoxColor"
            fill="none"
            x="0"
            y="0"
            :width="item.area.w"
            :height="item.area.h"
        />

        <g v-if="item.childItems && item.visible">
            <item-svg v-for="childItem in item.childItems"
                v-if="childItem.visible"
                :key="`${childItem.id}-${childItem.shape}-${schemeContainer.revision}`"
                :item="childItem"
                :mode="mode"
                :scheme-container="schemeContainer"
                :boundary-box-color="schemeContainer.scheme.style.boundaryBoxColor"
                @custom-event="$emit('custom-event', arguments[0])"
                />
        </g>    

    </g>
</template>

<script>
import Shape from './shapes/Shape.js';
import EventBus from '../EventBus.js';
import ConnectorSvg from './ConnectorSvg.vue';
import myMath from '../../../myMath';


export default {
    name: 'item-svg',
    props: ['item', 'mode', 'schemeContainer', 'boundaryBoxColor'],
    components: {ConnectorSvg},

    mounted() {
        this.switchShape(this.item.shape);
        EventBus.subscribeForItemChanged(this.item.id, this.onItemChanged);
    },

    beforeDestroy() {
        EventBus.unsubscribeForItemChanged(this.item.id, this.onItemChanged);
    },

    data() {
        return {
            shapeComponent: null,
            oldShape: this.item.shape,
            itemSvgPath: null,
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

