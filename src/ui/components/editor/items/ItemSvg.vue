<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <g :transform="`translate(${item.area.x},${item.area.y}) rotate(${item.area.r})`"
        :style="{'opacity': item.opacity/100.0, 'mix-blend-mode': item.blendMode}"
    >
        <component
            :key="`item-component-${item.id}-${item.shape}-${revision}`"
            v-if="shouldBeDrawn"
            :is="shapeComponent"
            :item="item"
            :mode="mode"
            :style="{'opacity': item.selfOpacity/100.0}"
            @custom-event="onShapeCustomEvent">
        </component>

        <g v-if="!shapeComponent && item.visible && shapeType === 'standard' && itemSvgPath"
            :style="{'opacity': item.selfOpacity/100.0}">

            <advanced-fill :key="`advanced-fill-${item.id}-${revision}`" :fillId="`fill-pattern-${item.id}`" :fill="item.shapeProps.fill" :area="item.area"/>

            <path :d="itemSvgPath"
                :stroke-width="item.shapeProps.strokeSize + 'px'"
                :stroke="item.shapeProps.strokeColor"
                :stroke-dasharray="strokeDashArray"
                :fill="svgFill"></path>
        </g>

        <g v-for="slot in textSlots" v-if="slot.name !== hiddenTextSlotName">
            <foreignObject
                :x="slot.area.x" :y="slot.area.y" :width="slot.area.w" :height="slot.area.h">
                <div class="item-text-container" xmlns="http://www.w3.org/1999/xhtml"
                    :style="slot.style"
                    >
                    <div class="item-text-element" :data-item-text-element-item-id="item.id" style="display: inline-block" v-html="slot.sanitizedText"></div>
                </div>
            </foreignObject>
        </g>


        <g :id="`animation-container-${item.id}`"></g>

        <path v-if="itemSvgOutlinePath && shouldDrawEventLayer"
            class="svg-event-layer"
            data-preview-ignore="true"
            :id="`item-svg-path-${item.id}`"
            :d="itemSvgOutlinePath" 
            :data-item-id="item.id"
            :stroke-width="hoverPathStrokeWidth"
            :style="{'cursor': item.cursor}"
            stroke="rgba(255, 255, 255, 0)"
            :fill="hoverPathFill" />

        <g v-if="item.childItems && item.visible">
            <item-svg v-for="childItem in item.childItems"
                v-if="childItem.visible"
                :key="`${childItem.id}-${childItem.shape}`"
                :item="childItem"
                :mode="mode"
                @custom-event="$emit('custom-event', arguments[0])"
                />
        </g>    

    </g>
</template>

<script>
import AdvancedFill from './AdvancedFill.vue';
import StrokePattern from './StrokePattern.js';
import Shape from './shapes/Shape.js';
import EventBus from '../EventBus.js';
import myMath from '../../../myMath';
import utils from '../../../utils';
import htmlSanitize from '../../../../htmlSanitize';
import {generateTextStyle} from '../text/ItemText';
import {enrichItemTextSlotWithDefaults} from '../../../scheme/Item';
import forEach from 'lodash/forEach';


export default {
    name: 'item-svg',
    props: ['item', 'mode'],
    components: {AdvancedFill},

    mounted() {
        this.switchShape(this.item.shape);
        EventBus.subscribeForItemChanged(this.item.id, this.onItemChanged);
        EventBus.$on(EventBus.ITEM_TEXT_SLOT_EDIT_TRIGGERED, this.onItemTextSlotEditTriggered);
        EventBus.$on(EventBus.ITEM_TEXT_SLOT_EDIT_CANCELED, this.onItemTextSlotEditCanceled);
    },

    beforeDestroy() {
        EventBus.unsubscribeForItemChanged(this.item.id, this.onItemChanged);
        EventBus.$off(EventBus.ITEM_TEXT_SLOT_EDIT_TRIGGERED, this.onItemTextSlotEditTriggered);
        EventBus.$off(EventBus.ITEM_TEXT_SLOT_EDIT_CANCELED, this.onItemTextSlotEditCanceled);
    },

    data() {
        const shape = Shape.find(this.item.shape);

        const data = {
            shapeType             : shape.shapeType,
            shapeComponent        : null,
            oldShape              : this.item.shape,
            itemSvgPath           : null,
            itemSvgOutlinePath    : null,
            shouldDrawEventLayer  : true,
            shouldRenderText      : true,

            // using revision in order to trigger full re-render of item component
            // on each item changed event revision is incremented
            revision              : 0,
            textSlots             : [],

            // name of text slot that should not be drawn
            // this is used when in-place text slot edit is triggered
            hiddenTextSlotName    : null,

            strokeDashArray       : '',
            svgFill               : null
        };
        if (!shape.editorProps || !shape.editorProps.customTextRendering) {
            data.textSlots = this.generateTextSlots();
        } else {
            data.shouldRenderText = false;
        }
        return data;
    },

    methods: {
        switchShape(shapeId) {
            this.oldShape = this.item.shape;
            const shape = Shape.make(shapeId);
            this.shapeType = shape.shapeType;

            if (shape.editorProps && shape.editorProps.ignoreEventLayer && this.mode === 'view') {
                this.shouldDrawEventLayer = false;
            }
            if (shape.vueComponent) {
                this.shapeComponent = shape.vueComponent;
            } else {
                this.shapeComponent = null;
            }

            if (shape.shapeType === 'standard') {
                this.svgFill = AdvancedFill.computeStandardFill(this.item);
                this.strokeDashArray = StrokePattern.createDashArray(this.item.shapeProps.strokePattern, this.item.shapeProps.strokeSize);
            }

            this.itemSvgPath = shape.computePath(this.item);
            this.itemSvgOutlinePath = shape.computeOutline(this.item);
        },

        onItemChanged() {
            const shape = Shape.make(this.item.shape);
            if (this.oldShape !== this.item.shape) {
                this.switchShape(this.item.shape);
            } else {
                // re-computing item svg path for event layer
                if (shape) {
                    this.itemSvgPath = shape.computePath(this.item);
                    this.itemSvgOutlinePath = shape.computeOutline(this.item);
                }
            }

            if (shape.shapeType === 'standard') {
                this.svgFill = AdvancedFill.computeStandardFill(this.item);
                this.strokeDashArray = StrokePattern.createDashArray(this.item.shapeProps.strokePattern, this.item.shapeProps.strokeSize);
            }

            this.revision += 1;


            if (!shape.editorProps || !shape.editorProps.customTextRendering) {
                this.textSlots = this.generateTextSlots();
            }
            this.$forceUpdate();
        },

        onShapeCustomEvent(eventName, ...args) {
            this.$emit('custom-event', {
                itemId: this.item.id,
                eventName: eventName,
                args: arguments
            });
        },

        generateTextSlots() {
            const shape = Shape.find(this.item.shape);
            const slots = utils.clone(shape.getTextSlots(this.item));
            
            const filteredSlots = [];
            forEach(slots, slot => {
                const itemTextSlot = this.item.textSlots[slot.name];
                if (itemTextSlot) {
                    slot.text = itemTextSlot.text || '';
                    slot.sanitizedText = htmlSanitize(slot.text);
                    slot.style = generateTextStyle(itemTextSlot);
                    slot.style.width = `${slot.area.w}px`;
                    slot.style.height = `${slot.area.h}px`;
                    filteredSlots.push(slot);
                }
            });

            return filteredSlots;
        },

        onItemTextSlotEditTriggered(item, slotName, area) {
            if (item.id === this.item.id) {
                this.hiddenTextSlotName = slotName;
            }
        },

        onItemTextSlotEditCanceled(item, slotName) {
            if (item.id === this.item.id && this.hiddenTextSlotName === slotName) {
                this.hiddenTextSlotName = null;
            }
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
            if (this.item.shape === 'curve') {
                if (this.item.shapeProps.fill && this.item.shapeProps.fill.type === 'none') {
                    return 'none';
                }
            }
            return 'rgba(255, 255, 255, 0)';
        },

        shouldBeDrawn() {
            if (!this.shapeComponent) {
                return false;
            }
            if (!this.item.visible) {
                return false;
            }

            if (this.mode === 'view' && this.shapeComponent.editorProps && this.shapeComponent.editorProps.onlyEditMode) {
                return false;
            }
            return true;
        }
    }
}
</script>

