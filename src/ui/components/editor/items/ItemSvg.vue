<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <g :transform="`translate(${item.area.x},${item.area.y}) rotate(${item.area.r})`"
        :style="{'opacity': item.opacity/100.0, 'mix-blend-mode': item.blendMode}"
        :data-svg-item-container-id="item.id" >

        <g v-for="backgroundEffectHTML in backgroundEffects" v-html="backgroundEffectHTML"></g>

        <defs>
            <filter v-for="svgFilter in svgFilters" :id="svgFilter.id" v-html="svgFilter.html"></filter>
        </defs>

        <g :filter="filterUrl">
            <component
                :key="`item-component-${item.id}-${item.shape}-${revision}`"
                v-if="shouldBeDrawn && shapeComponent && item.visible"
                :is="shapeComponent"
                :item="item"
                :mode="mode"
                :style="{'opacity': item.selfOpacity/100.0}"
                @custom-event="onShapeCustomEvent"
                @frame-animator="onFrameAnimatorEvent">
            </component>

            <g v-if="!shapeComponent && item.visible && (shapeType === 'standard') && itemStandardCurves"
                :style="{'opacity': item.selfOpacity/100.0}">

                <advanced-fill :key="`advanced-fill-${item.id}-${revision}`" :fillId="`fill-pattern-${item.id}`" :fill="item.shapeProps.fill" :area="item.area"/>

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

        <g v-for="foregroundEffectHTML in foregroundEffects" v-html="foregroundEffectHTML"></g>


        <g :id="`animation-container-${item.id}`" data-preview-ignore="true"></g>

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

        <path v-if="itemSvgOutlinePath && diff"
            class="svg-event-diff-outline"
            data-preview-ignore="true"
            :data-item-id="item.id"
            :d="itemSvgOutlinePath" 
            stroke-width="10px"
            :style="{'cursor': item.cursor}"
            :stroke="diff.color"
            style="opacity: 0.5;"
            fill="none"
            />


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
            <ItemSvg v-for="childItem in item.childItems"
                v-if="childItem.visible"
                :key="`${childItem.id}-${childItem.shape}`"
                :item="childItem"
                :mode="mode"
                @custom-event="$emit('custom-event', arguments[0])"
                @frame-animator="onFrameAnimatorEvent"
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
import { ChangeType } from '../../../scheme/scheme-diff';

function generateFilters(item) {
    const svgFilters = [];
    let filterUrl = '';
    const backgroundEffects = [];
    const foregroundEffects = [];

    forEach(item.effects, (itemEffect, idx) => {
        const effect = getEffectById(itemEffect.id);
        if (effect) {
            if (effect.type === 'svg-filter') {
                const filterId = `item-svg-filter-effect-${item.id}-${effect.id}-${idx}`;
                svgFilters.push({
                    id: filterId,
                    html: effect.applyEffect(item, idx, itemEffect.args)
                });

                filterUrl += `url(#${filterId}) `;
            } else if (effect.type === 'back') {
                backgroundEffects.push(effect.applyEffect(item, idx, itemEffect.args));
            } else if (effect.type === 'front') {
                foregroundEffects.push(effect.applyEffect(item, idx, itemEffect.args));
            }
        }
    });
    return {
        svgFilters,
        filterUrl,
        backgroundEffects,
        foregroundEffects
    };
}


export default {
    name: 'ItemSvg',
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

            svgFilters            : [],
            filterUrl             : '',
            backgroundEffects     : [],
            foregroundEffects     : [],
            diff                  : null
        };

        if (this.item.meta && this.item.meta.diff) {
            data.diff = {
                color: 'rgb(100, 100, 255)'
            };
            if (this.item.meta.diff.change === ChangeType.DELETION) {
                data.diff.color = 'rgb(255, 100, 100)';
            } else if (this.item.meta.diff.change === ChangeType.ADDITION) {
                data.diff.color = 'rgb(100, 255, 100)';
            }
        }

        if (!shape.editorProps || !shape.editorProps.customTextRendering) {
            data.textSlots = this.generateTextSlots();
        } else {
            data.shouldRenderText = false;
        }

        const {svgFilters, filterUrl, backgroundEffects, foregroundEffects} = generateFilters(this.item);
        data.svgFilters = svgFilters;
        data.filterUrl = filterUrl;
        data.backgroundEffects = backgroundEffects;
        data.foregroundEffects = foregroundEffects;

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
                this.itemStandardCurves = Shape.computeStandardCurves(this.item, shape);
            }

            this.itemSvgOutlinePath = shape.computeOutline(this.item);
        },

        onItemChanged() {
            const shape = Shape.find(this.item.shape);
            if (this.oldShape !== this.item.shape) {
                this.switchShape(this.item.shape);
            } else if (shape) {
                // re-computing item svg path for event layer
                if (shape.shapeType === 'standard') {
                    this.strokeDashArray = StrokePattern.createDashArray(this.item.shapeProps.strokePattern, this.item.shapeProps.strokeSize);
                    this.itemStandardCurves = Shape.computeStandardCurves(this.item, shape);
                }
                this.itemSvgOutlinePath = shape.computeOutline(this.item);
            }


            this.revision += 1;

            if (!shape.editorProps || !shape.editorProps.customTextRendering) {
                this.textSlots = this.generateTextSlots();
            }

            //updating filters
            const {svgFilters, filterUrl, backgroundEffects, foregroundEffects} = generateFilters(this.item);
            this.svgFilters = svgFilters;
            this.filterUrl = filterUrl;
            this.backgroundEffects = backgroundEffects;
            this.foregroundEffects = foregroundEffects;

            this.$forceUpdate();
        },

        onShapeCustomEvent(eventName, ...args) {
            this.$emit('custom-event', {
                itemId: this.item.id,
                eventName: eventName,
                args: arguments
            });
        },

        onFrameAnimatorEvent(args) {
            this.$emit('frame-animator', args);
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

