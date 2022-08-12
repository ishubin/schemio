<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <g :transform="svgItemTransform"
        :style="{'opacity': item.opacity/100.0, 'mix-blend-mode': item.blendMode}"
        :data-svg-item-container-id="item.id" :data-item-id="item.id">

        <g v-for="backgroundEffectHTML in backgroundEffects" v-html="backgroundEffectHTML"></g>

        <defs>
            <filter v-for="svgFilter in svgFilters" :id="svgFilter.id" v-html="svgFilter.html" x="-50%" y="-50%" width="200%" height="200%"></filter>
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
                    :data-item-id="item.id"
                    stroke-linejoin="round"
                    :fill="curve.fill"></path>
            </g>

            <g v-for="slot in textSlots" v-if="slot.name !== hiddenTextSlotName">
                <foreignObject
                    ref="textSlots"
                    :data-text-slot-name="slot.name"
                    :id="`item-text-slot-${item.id}-${slot.name}`"
                    :x="slot.area.x" :y="slot.area.y" :width="slot.area.w" :height="slot.area.h">
                    <div class="item-text-container" xmlns="http://www.w3.org/1999/xhtml"
                        :class="slot.cssClass"
                        :style="slot.style"
                        :data-item-id="item.id"
                        >
                        <div class="item-text-element" :data-item-text-element-item-id="item.id" style="display: inline-block" v-html="slot.sanitizedText"></div>
                    </div>
                </foreignObject>
            </g>
        </g>

        <g v-for="foregroundEffectHTML in foregroundEffects" v-html="foregroundEffectHTML"></g>


        <g :id="`animation-container-${item.id}`" data-preview-ignore="true"></g>


        <g v-if="item._childItems && item.visible && mode === 'edit'"
            :style="childrenLayerStyle"
            >
            <ItemSvg v-for="childItem in item._childItems"
                v-if="childItem.visible"
                :key="`${childItem.id}-${childItem.shape}`"
                :item="childItem"
                :patchIndex="patchIndex"
                :mode="mode"
                @custom-event="$emit('custom-event', arguments[0])"
                @frame-animator="onFrameAnimatorEvent"
                />
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


        <path v-if="itemSvgOutlinePath && patchOutline && patchIsDiffColoringEnabled"
            data-preview-ignore="true"
            :d="itemSvgOutlinePath" 
            :data-item-id="item.id"
            :stroke-width="patchOutlineStrokeSize"
            :stroke="patchOutline"
            fill="none" />

        <g v-if="item.childItems && item.visible"
            :style="childrenLayerStyle"
            >
            <ItemSvg v-for="childItem in item.childItems"
                v-if="childItem.visible && (childItem.shape !== 'hud' && mode === 'view' || mode === 'edit' )"
                :key="`${childItem.id}-${childItem.shape}`"
                :item="childItem"
                :patchIndex="patchIndex"
                :mode="mode"
                @custom-event="$emit('custom-event', arguments[0])"
                @frame-animator="onFrameAnimatorEvent"
                />
        </g>

        <g v-if="item._childItems && item.visible && mode === 'view'"
            :style="childrenLayerStyle"
            >
            <ItemSvg v-for="childItem in item._childItems"
                v-if="childItem.visible && childItem.shape !== 'hud'"
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
import { findEffect } from '../../effects/Effects';
import myMath from '../../../myMath';

function generateFilters(item) {
    const svgFilters = [];
    let filterUrl = '';
    const backgroundEffects = [];
    const foregroundEffects = [];

    forEach(item.effects, (itemEffect, idx) => {
        const effect = findEffect(itemEffect.effect);
        if (effect) {
            const generatedEffect = effect.applyEffect(item, idx, itemEffect.args);

            if (generatedEffect.kind === 'svg-filter') {
                const filterId = `item-svg-filter-effect-${item.id}-${idx}`;
                svgFilters.push({
                    id: filterId,
                    html: generatedEffect.html
                });

                filterUrl += `url(#${filterId}) `;
            } else if (generatedEffect.kind === 'back') {
                backgroundEffects.push(generatedEffect.html);
            } else if (generatedEffect.kind === 'front') {
                foregroundEffects.push(generatedEffect.html);
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

function hasStrokeSizeProp(shape) {
    const descriptor = Shape.getShapePropDescriptor(shape, 'strokeSize');
    return descriptor && descriptor.type === 'number';
}


export default {
    name: 'ItemSvg',
    props: {
        item                : {type: Object},
        mode                : {type: String},
        patchIndex          : {type: Object, default: null},
        mode                : { type: String, default: 'edit' },
        textSelectionEnabled: {type: Boolean, default: false},
    },
    components: {AdvancedFill},

    mounted() {
        this.switchShape(this.item.shape);
        EventBus.subscribeForItemChanged(this.item.id, this.onItemChanged);
        EventBus.$on(EventBus.ITEM_TEXT_SLOT_EDIT_TRIGGERED, this.onItemTextSlotEditTriggered);
        EventBus.$on(EventBus.ITEM_TEXT_SLOT_EDIT_CANCELED, this.onItemTextSlotEditCanceled);

        const shape = Shape.find(this.item.shape);
        if (shape.shapeEvents.mounted) {
            shape.shapeEvents.mounted(this.item, {
                textSlots: this.$refs.textSlots
            });
        }
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

            supportsStrokeSize    : hasStrokeSizeProp(shape),

            svgFilters            : [],
            filterUrl             : '',
            backgroundEffects     : [],
            foregroundEffects     : [],
            svgItemTransform      : this.calculateSVGItemTransform()
        };

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
        calculateSVGItemTransform() {
            const m = myMath.standardTransformWithArea(myMath.identityMatrix(), this.item.area);
            return `matrix(${m[0][0]},${m[1][0]},${m[0][1]},${m[1][1]},${m[0][2]},${m[1][2]})`
        },

        switchShape(shapeId) {
            this.oldShape = this.item.shape;
            const shape = Shape.find(shapeId);
            this.shapeType = shape.shapeType;
            this.supportsStrokeSize = hasStrokeSizeProp(shape);

            if (shape.editorProps && shape.editorProps.ignoreEventLayer && this.mode === 'view' || (this.mode === 'view' && this.textSelectionEnabled)) {
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

        onItemChanged(propertyPath) {
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

            this.svgItemTransform = this.calculateSVGItemTransform();

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
                    if (!slot.cssClass) {
                        slot.cssClass = '';
                    }
                    slot.style = generateTextStyle(itemTextSlot);
                    slot.style.width = `${slot.area.w}px`;
                    slot.style.height = `${slot.area.h}px`;
                    filteredSlots.push(slot);
                }
            });

            return filteredSlots;
        },

        onItemTextSlotEditTriggered(item, slotName, area, markupDisabled) {
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
            if (this.supportsStrokeSize) {
                return (parseInt(this.item.shapeProps.strokeSize) + 2)  + 'px';
            }
            return '0px';
        },

        hoverPathFill() {
            if (this.item.shape === 'path') {
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
        },

        patchOutline() {
            if (this.patchIndex) {
                if (this.patchIndex.addedItems.has(this.item.id)) {
                    return this.$store.getters.patchAdditionsColor;
                }
                if (this.patchIndex.deletedItems.has(this.item.id)) {
                    return this.$store.getters.patchDeletionsColor;
                }
                if (this.patchIndex.modifiedItems.has(this.item.id)) {
                    return this.$store.getters.patchModificationsColor;
                }
            }
            return null;
        },

        patchIsDiffColoringEnabled() {
            return this.$store.getters.patchIsDiffColoringEnabled;
        },

        patchOutlineStrokeSize() {
            if (this.supportsStrokeSize) {
                return (parseInt(this.item.shapeProps.strokeSize) + 10)  + 'px';
            }
            return '8px';
        }
    }
}
</script>

