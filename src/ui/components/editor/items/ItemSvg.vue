<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <g :transform="`translate(${item.area.x},${item.area.y}) rotate(${item.area.r})`"
        :style="{'opacity': item.opacity/100.0, 'mix-blend-mode': item.blendMode}"
        :data-svg-item-container-id="item.id" >

         <defs>
            <filter v-for="svgFilter in svgFilters" :id="svgFilter.id" v-html="svgFilter.html"></filter>
        </defs>

        <g v-if="shouldBeDrawn && shapeComponent && item.visible" v-for="repeater in repeatedLayers"  :transform="`translate(${repeater.x},${repeater.y})`" data-qwe="repeated-layer">
            <component
                :key="`item-component-${item.id}-${item.shape}-repeater-${repeater.id}-${revision}`"
                v-if="shouldBeDrawn"
                :is="shapeComponent"
                :item="item"
                :mode="mode"
                :style="{'opacity': item.selfOpacity/100.0}"
                @custom-event="onShapeCustomEvent">
            </component>
        </g>

        <g :filter="filterUrl">
            <component
                :key="`item-component-${item.id}-${item.shape}-${revision}`"
                v-if="shouldBeDrawn && shapeComponent && item.visible"
                :is="shapeComponent"
                :item="item"
                :mode="mode"
                :style="{'opacity': item.selfOpacity/100.0}"
                @custom-event="onShapeCustomEvent">
            </component>

            <g v-if="!shapeComponent && item.visible && (shapeType === 'standard') && itemStandardCurves"
                :style="{'opacity': item.selfOpacity/100.0}">

                <advanced-fill :key="`advanced-fill-${item.id}-${revision}`" :fillId="`fill-pattern-${item.id}`" :fill="item.shapeProps.fill" :area="item.area"/>

                <g v-for="repeater in repeatedLayers"  :transform="`translate(${repeater.x},${repeater.y})`" data-qwe="repeated-layer">
                    <path v-for="curve in itemStandardCurves" :d="curve.path"
                        :stroke-width="curve.strokeSize + 'px'"
                        :stroke="curve.strokeColor"
                        :stroke-dasharray="strokeDashArray"
                        stroke-linejoin="round"
                        :fill="curve.fill"></path>
                </g>

                <path v-for="curve in itemStandardCurves" :d="curve.path"
                    :stroke-width="curve.strokeSize + 'px'"
                    :stroke="curve.strokeColor"
                    :stroke-dasharray="strokeDashArray"
                    stroke-linejoin="round"
                    :fill="curve.fill"></path>
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
        </g>


        <g :id="`animation-container-${item.id}`" data-preview-ignore="true"></g>

        <g v-for="repeater in repeatedLayers"  :transform="`translate(${repeater.x},${repeater.y})`" data-qwe="repeated-layer">
            <path v-if="itemSvgOutlinePath && shouldDrawEventLayer"
                class="svg-event-layer"
                data-preview-ignore="true"
                :id="`item-svg-path-${item.id}-repeater-${repeater.id}`"
                :d="itemSvgOutlinePath" 
                :data-item-id="item.id"
                :stroke-width="hoverPathStrokeWidth"
                :style="{'cursor': item.cursor}"
                stroke="rgba(255, 255, 255, 0)"
                fill="rgba(255, 255, 255, 0)" />
        </g>
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

        <defs v-if="item.clip">
            <clipPath :id="`item-clip-path-${item.id}`">
                <path v-if="itemSvgOutlinePath"
                    class="svg-event-layer"
                    :d="itemSvgOutlinePath" 
                    :data-item-id="item.id"
                    stroke-width="0px"
                    stroke="rgba(255, 255, 255, 0)"
                    fill="rgba(255, 255, 255, 0)" />
                    </clipPath>
        </defs>

        <g v-if="item.childItems && item.visible" :style="childrenLayerStyle">
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
import utils from '../../../utils';
import htmlSanitize from '../../../../htmlSanitize';
import {generateTextStyle} from '../text/ItemText';
import forEach from 'lodash/forEach';
import { getEffectById } from '../../effects/Effects';

function computeStandardCurves(item, shape) {
    if (shape.computeCurves) {
        return shape.computeCurves(item);
    } else if (shape.computePath) {
        return [{
            path: shape.computePath(item),
            fill: AdvancedFill.computeStandardFill(item),
            strokeColor: item.shapeProps.strokeColor,
            strokeSize: item.shapeProps.strokeSize
        }];
    }
}

function generateSVGFilters(item) {
    const svgFilters = [];
    let filterUrl = '';
    forEach(item.effects, (itemEffect, idx) => {
        const effect = getEffectById(itemEffect.id);
        if (effect && effect.applySVGFilterEffect) {
            const filterId = `item-svg-filter-effect-${item.id}-${effect.id}-${idx}`;
            svgFilters.push({
                id: filterId,
                html: effect.applySVGFilterEffect(item, itemEffect.args)
            });

            filterUrl += `url(#${filterId}) `;
        }
    });
    return {
        svgFilters,
        filterUrl
    };
}


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
            itemStandardCurves    : [],
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

            repeatedLayers        : [],
            svgFilters            : [],
            filterUrl             : ''
        };
        if (!shape.editorProps || !shape.editorProps.customTextRendering) {
            data.textSlots = this.generateTextSlots();
        } else {
            data.shouldRenderText = false;
        }

        const {svgFilters, filterUrl} = generateSVGFilters(this.item);
        data.svgFilters = svgFilters;
        data.filterUrl = filterUrl;

        return data;
    },

    methods: {
        switchShape(shapeId) {
            this.oldShape = this.item.shape;
            const shape = Shape.find(shapeId);
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
                this.strokeDashArray = StrokePattern.createDashArray(this.item.shapeProps.strokePattern, this.item.shapeProps.strokeSize);
                this.itemStandardCurves = computeStandardCurves(this.item, shape);
            }

            this.itemSvgOutlinePath = shape.computeOutline(this.item);
            this.repeatedLayers = this.calculateRepeatedLayers();
        },

        onItemChanged() {
            const shape = Shape.find(this.item.shape);
            if (this.oldShape !== this.item.shape) {
                this.switchShape(this.item.shape);
            } else if (shape) {
                // re-computing item svg path for event layer
                this.itemStandardCurves = computeStandardCurves(this.item, shape);
                this.itemSvgOutlinePath = shape.computeOutline(this.item);
            }

            this.repeatedLayers = this.calculateRepeatedLayers();

            this.revision += 1;

            if (!shape.editorProps || !shape.editorProps.customTextRendering) {
                this.textSlots = this.generateTextSlots();
            }

            //updating filters
            const {svgFilters, filterUrl} = generateSVGFilters(this.item);
            this.svgFilters = svgFilters;
            this.filterUrl = filterUrl;

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
        },

        calculateRepeatedLayers() {
            if (this.item.repeat > 0) {
                const repeaters = [];
                for(let i = this.item.repeat; i > 0; i--) {
                    repeaters.push({
                        id: i,
                        x: this.item.repeatOffsetX * i,
                        y: this.item.repeatOffsetY * i,
                    });
                }
                return repeaters;
            }
            return [];
        }
    },

    computed: {
        hoverPathStrokeWidth() {
            if (this.item.shape === 'curve' || this.item.shape === 'connector') {
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
            if (this.item.shape === 'connector' && !this.item.shapeProps.fat) {
                return 'none';
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

            if (this.mode === 'view' && this.shapeComponent.shapeConfig.editorProps && this.shapeComponent.shapeConfig.editorProps.onlyEditMode) {
                return false;
            }
            return true;
        },

        childrenLayerStyle() {
            if (this.item.clip) {
                return {
                    'clip-path': `url(#item-clip-path-${this.item.id})`
                };
            }
            return {};
        }
    }
}
</script>

