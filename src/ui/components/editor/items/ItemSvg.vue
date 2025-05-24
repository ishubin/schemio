<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <g :transform="svgItemTransform" :data-svg-item-container-id="item.id" :data-item-id="item.id">
        <path v-if="itemSvgOutlinePath && patchOutline && patchIsDiffColoringEnabled"
            data-preview-ignore="true"
            :d="itemSvgOutlinePath"
            :data-item-id="item.id"
            :stroke-width="patchOutlineStrokeSize"
            :stroke="patchOutline"
            fill="none" />

        <advanced-fill v-if="effectFill" :key="`effect-fill-${item.id}-${revision}`" :fillId="`effect-fill-${item.id}`" :fill="effectFill" :area="item.area"/>

        <g :style="{'opacity': item.opacity/100.0, 'mix-blend-mode': item.blendMode, 'filter': cascadingFilter}">
            <g v-for="backgroundEffectHTML in backgroundEffects" v-html="backgroundEffectHTML" :style="shapeStyle"></g>

            <defs>
                <filter v-for="svgFilter in svgFilters" :id="svgFilter.id" v-html="svgFilter.html" x="-50%" y="-50%" width="200%" height="200%"></filter>
            </defs>

            <g :filter="filterUrl" :data-component-key="`item-component-${item.id}-${item.shape}-${revision}`">
                <component
                    :key="`item-component-${item.id}-${item.shape}-${revision}`"
                    v-if="shouldBeDrawn && shapeComponent && item.visible"
                    :is="shapeComponent"
                    :item="item"
                    :editorId="editorId"
                    :mode="mode"
                    :style="shapeStyle"
                    @frame-animator="passThroughFrameAnimatorEvent"
                    @component-load-requested="onComponentLoadRequested"
                    >
                </component>


                <g v-if="!shapeComponent && item.visible && shapePrimitives && shouldBeDrawn"
                    :style="shapeStyle">

                    <g v-for="(primitive, primitiveIdx) in shapePrimitives">
                        <g v-if="primitive.type === 'text'">
                            <foreignObject :x="primitive.area.x" :y="primitive.area.y"  :width="primitive.area.w" :height="primitive.area.h">
                                <div xmlns="http://www.w3.org/1999/xhtml" :style="{width: `${primitive.area.w}px`, height: `${primitive.area.h}px`, color: primitive.fontColor, 'font-size': `${primitive.fontSize}px`}">
                                    <div>{{ primitive.text }}</div>
                                </div>
                            </foreignObject>

                            <rect
                                :x="primitive.area.x"
                                :y="primitive.area.y"
                                :width="primitive.area.w"
                                :height="primitive.area.h"
                                stroke-width="0"
                                :data-item-id="item.id"
                                fill="rgba(255,255,255,0.0)"/>
                        </g>
                        <g v-else>
                            <advanced-fill v-if="primitive.fill" :key="`advanced-fill-${item.id}-${primitiveIdx}-${revision}`" :fillId="`fill-templated-${item.id}-${primitiveIdx}`" :fill="primitive.fill" :area="item.area"/>

                            <path v-if="primitive.svgPath" :d="primitive.svgPath"
                                :stroke-width="primitive.strokeSize + 'px'"
                                :stroke="primitive.strokeColor"
                                :stroke-dasharray="computeStrokeDashArray(primitive.strokePattern, primitive.strokeSize)"
                                :stroke-dashoffset="item.meta.strokeOffset"
                                :data-item-id="item.id"
                                stroke-linejoin="round"
                                :fill="computeSvgFill(primitive.fill, `fill-templated-${item.id}-${primitiveIdx}`)"></path>
                        </g>
                    </g>

                </g>
                <g v-if="shapeType === 'missing' && item.visible" class="missing-shape">
                    <rect x="0" y="0" :width="item.area.w" :height="item.area.h" />
                    <foreignObject x="0" y="0"  :width="item.area.w" :height="item.area.h">
                        <div xmlns="http://www.w3.org/1999/xhtml" :style="{width: `${item.area.w}px`, height: `${item.area.h}px`}">
                            <div :style="missingShapeTextStyle">Missing Shape</div>
                        </div>
                    </foreignObject>
                </g>

                <g v-if="shouldBeDrawn">
                    <g v-for="slot in textSlots" v-if="slot.name !== item.meta.activeTextSlot" :style="{'opacity': item.selfOpacity/100.0}">
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
            </g>

            <g v-for="foregroundEffectHTML in foregroundEffects" v-html="foregroundEffectHTML"></g>


            <g :id="`animation-container-${item.id}`"></g>

            <g v-if="item._childItems && item.visible && mode === 'edit'" :style="componentChildrenLayerStyle">
                <ItemSvg v-for="childItem in item._childItems"
                    v-if="childItem.visible"
                    :key="`itsvg-${childItem.id}-${childItem.shape}-${item.meta.revision}`"
                    :item="childItem"
                    :editorId="editorId"
                    :patchIndex="patchIndex"
                    :mode="mode"
                    :eventListener="eventListener"
                    @frame-animator="passThroughFrameAnimatorEvent"
                    @component-load-requested="onComponentLoadRequested"
                    />
            </g>

            <path v-if="shouldBeDrawn && itemSvgOutlinePath && !textSelectionEnabled"
                class="svg-event-layer"
                data-preview-ignore="true"
                :id="`item-svg-path-${item.id}`"
                :d="itemSvgOutlinePath"
                :data-item-id="item.id"
                :stroke-width="hoverPathStrokeWidth"
                :style="{'cursor': item.cursor}"
                :stroke="hoverPathStroke"
                @dragenter="onItemDragEnter"
                @dragover="onItemDragOver"
                @dragleave="onItemDragLeave"
                @drop="onItemDrop"
                :fill="hoverPathFill" />

            <g v-if="mode === 'view' && !textSelectionEnabled">
                <path v-for="customArea in customAreas"
                    class="svg-event-layer"
                    data-preview-ignore="true"
                    :style="{cursor: customArea.cursor ? customArea.cursor : item.cursor}"
                    :id="`item-svg-path-${item.id}`"
                    :d="customArea.path"
                    data-type="custom-item-area"
                    :data-item-id="item.id"
                    :data-custom-area-id="customArea.id"
                    :stroke-width="hoverPathStrokeWidth"
                    stroke="rgba(255, 255, 255, 0)"
                    :fill="hoverPathFill" />
            </g>


            <rect v-if="shapeType === 'missing'"
                class="svg-event-layer"
                data-preview-ignore="true"
                :data-item-id="item.id"
                x="0" y="0"
                :width="item.area.w"
                :height="item.area.h"
                stroke="rgba(255, 255, 255, 0)"
                :fill="hoverPathFill" />

            <g v-if="mode === 'view' && item.meta.componentSchemeContainer && item.meta.componentUserEventBus"
                @touchstart="onComponentMouseDown"
                @touchend="onComponentMouseUp"
                @touchmove="onComponentMouseMove"
                @mousedown="onComponentMouseDown"
                @mouseup="onComponentMouseUp"
                @mousemove="onComponentMouseMove"
                >
                <g v-for="componentItem in item.meta.componentSchemeContainer.worldItems" class="item-container"
                    v-if="componentItem.visible && componentItem.shape !== 'hud'"
                    :class="'item-cursor-' + componentItem.cursor">
                    <ItemSvg
                        :key="`${item.id}-component-${componentItem.id}-${componentItem.shape}-${textSelectionEnabled}`"
                        :item="componentItem"
                        :editorId="editorId"
                        :mode="mode"
                        :textSelectionEnabled="textSelectionEnabled"
                        :patchIndex="patchIndex"
                        :eventListener="eventListener"
                        @component-load-requested="onComponentLoadRequested"
                        @frame-animator="onFrameAnimatorEventInsideComponent" />
                </g>
            </g>

            <g v-if="mode === 'edit' && !isSelected && showItemDetailMarkers && (hasDescription || hasLinks || hasFiles)" data-preview-ignore="true">
                <foreignObject :x="detailsMarker.x" :y="detailsMarker.y" :width="detailsMarker.w" :height="detailsMarker.h" :data-item-id="item.id">
                    <div xmlns="http://www.w3.org/1999/xhtml" class="item-details-marker-icon" :data-item-id="item.id">
                        <i v-if="hasFiles" class="icon fa-solid fa-paperclip" :data-item-id="item.id"></i>
                        <i v-else-if="hasLinks" class="icon fa-solid fa-link" :data-item-id="item.id"></i>
                        <i v-else class="icon fa-solid fa-paragraph" :data-item-id="item.id"></i>
                    </div>
                </foreignObject>
                <rect
                    :x="detailsMarker.x"
                    :y="detailsMarker.y"
                    :width="detailsMarker.w"
                    :height="detailsMarker.h"
                    data-type="item-details-marker"
                    :data-item-id="item.id"
                    :style="{cursor: item.cursor}"
                    fill="rgba(0,0,0,0)"
                    />
            </g>

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
                    v-if="childItem.visible && (childItem.shape !== 'hud' && mode === 'view' || mode === 'edit' )"
                    :key="`itsvg-${childItem.id}-${childItem.shape}-${textSelectionEnabled}`"
                    :item="childItem"
                    :editorId="editorId"
                    :textSelectionEnabled="textSelectionEnabled"
                    :patchIndex="patchIndex"
                    :mode="mode"
                    :eventListener="eventListener"
                    @frame-animator="passThroughFrameAnimatorEvent"
                    @component-load-requested="onComponentLoadRequested"
                    />
            </g>

            <g v-if="item._childItems && item.visible && mode === 'view'" :style="componentChildrenLayerStyle">
                <ItemSvg v-for="childItem in item._childItems"
                    v-if="childItem.visible && childItem.shape !== 'hud'"
                    :key="`itsvg-${childItem.id}-${childItem.shape}-${textSelectionEnabled}`"
                    :item="childItem"
                    :editorId="editorId"
                    :textSelectionEnabled="textSelectionEnabled"
                    :mode="mode"
                    :eventListener="eventListener"
                    @frame-animator="passThroughFrameAnimatorEvent"
                    @component-load-requested="onComponentLoadRequested"
                    />
            </g>
        </g>
    </g>
</template>

<script>
import AdvancedFill from './AdvancedFill.vue';
import {computeSvgFill} from './AdvancedFill.vue';
import StrokePattern from './StrokePattern.js';
import Shape from './shapes/Shape.js';
import utils from '../../../utils';
import htmlSanitize from '../../../../htmlSanitize';
import {generateTextStyle} from '../text/ItemText';
import {forEach} from '../../../collections';
import { findEffect } from '../../effects/Effects';
import myMath from '../../../myMath';
import EditorEventBus from '../EditorEventBus';
import StoreUtils from '../../../store/StoreUtils';
import { hasItemDescription } from '../../../scheme/Item';
import Events from '../../../userevents/Events.js';

/**
 * @property {Item} item
 */
function generateFilters(item) {
    const svgFilters = [];
    let filterUrl = '';
    const backgroundEffects = [];
    const foregroundEffects = [];
    let cssFilter = '';
    let cascadingFilter = '';

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

                if (itemEffect.cascade) {
                    cascadingFilter += `url(#${filterId}) `;
                } else {
                    filterUrl += `url(#${filterId}) `;
                }
            } else if (generatedEffect.kind === 'back') {
                backgroundEffects.push(generatedEffect.html);
            } else if (generatedEffect.kind === 'front') {
                foregroundEffects.push(generatedEffect.html);
            } else if (generatedEffect.kind === 'css-filter') {
                if (itemEffect.cascade) {
                    cascadingFilter += generatedEffect.value + ' ';
                } else {
                    cssFilter += generatedEffect.value + ' ';
                }
            }
        }
    });
    return {
        svgFilters,
        filterUrl,
        backgroundEffects,
        foregroundEffects,
        cssFilter,
        cascadingFilter
    };
}

function hasStrokeSizeProp(shape) {
    const descriptor = Shape.getShapePropDescriptor(shape, 'strokeSize');
    return descriptor && descriptor.type === 'number';
}

export default {
    name: 'ItemSvg',
    props: {
        editorId            : {type: String, required: true},
        item                : {type: Object},
        mode                : {type: String},
        patchIndex          : {type: Object, default: null},
        mode                : { type: String, default: 'edit' },
        textSelectionEnabled: {type: Boolean, default: false},
        // used for passing intercepted events in external component items
        eventListener       : {type: Object, required: true},
    },
    components: {AdvancedFill },

    mounted() {
        this.switchShape(this.item.shape);
        EditorEventBus.item.changed.specific.$on(this.editorId, this.item.id, this.onItemChanged);
        EditorEventBus.item.selected.specific.$on(this.editorId, this.item.id, this.onItemSelected);
        EditorEventBus.item.deselected.specific.$on(this.editorId, this.item.id, this.onItemDeselected);
        EditorEventBus.textSlot.canceled.specific.$on(this.editorId, this.item.id, this.onItemTextSlotEditCanceled);

        const shape = Shape.find(this.item.shape);
        if (shape && shape.shapeEvents.mounted) {
            shape.shapeEvents.mounted(this.$store, this.item, this.$refs.textSlots, this.editorId);
        }

        // triggering init events only when component was fully mounted
        if (this.item.meta.componentUserEventBus && this.item.meta.componentItemIdsForInit && this.mode === 'view') {
            this.item.meta.componentItemIdsForInit.forEach(itemId => {
                this.item.meta.componentUserEventBus.emitItemEvent(itemId, Events.standardEvents.init.id);
            });
        }
    },

    beforeDestroy() {
        EditorEventBus.item.changed.specific.$off(this.editorId, this.item.id, this.onItemChanged);
        EditorEventBus.item.selected.specific.$off(this.editorId, this.item.id, this.onItemSelected);
        EditorEventBus.item.deselected.specific.$off(this.editorId, this.item.id, this.onItemDeselected);
        EditorEventBus.textSlot.canceled.specific.$off(this.editorId, this.item.id, this.onItemTextSlotEditCanceled);

        if (this.item.meta.componentSchemeContainer) {
            EditorEventBus.component.destroyed.$emit(this.editorId, this.item.meta.componentSchemeContainer, this.item.meta.componentUserEventBus);
        }
    },

    data() {
        const shape = Shape.find(this.item.shape);

        const data = {
            shapeType         : shape ? shape.shapeType: 'missing',
            shapeComponent    : null,
            oldShape          : this.item.shape,
            shapePrimitives   : [],
            itemSvgOutlinePath: null,
            shouldRenderText  : true,

            // used to hide the item details markers for items that are part of the edit box, as it is not possible to hover mouse over it,
            // as it gets hidden under invisible edit box overlay
            isSelected: this.item.meta && this.item.meta.selected,

            // using revision in order to trigger full re-render of item component
            // on each item changed event revision is incremented
            revision : 0,
            textSlots: [],

            supportsStrokeSize: shape ? hasStrokeSizeProp(shape): false,

            hasDescription: hasItemDescription(this.item),
            hasLinks      : Array.isArray(this.item.links) && this.item.links.length > 0,
            hasFiles      : Array.isArray(this.item.links) && this.item.links.findIndex(link => link.type === 'file') >= 0,
            detailsMarker : shape.getDetailsMarker(this.item),

            svgFilters       : [],
            filterUrl        : '',
            cascadingFilter  : '',
            backgroundEffects: [],
            foregroundEffects: [],
            svgItemTransform : this.calculateSVGItemTransform(),
            customAreas      : shape && shape.computeCustomAreas ? shape.computeCustomAreas(this.item): [],

            draggingFileOver: false,
            shapeStyle: {},

            hoverPathFill: this.getHoverPathFill()
        };

        if (shape) {
            if (!shape.editorProps || !shape.editorProps.customTextRendering) {
                data.textSlots = this.generateTextSlots();
            } else {
                data.shouldRenderText = false;
            }
        }

        const {svgFilters, filterUrl, backgroundEffects, foregroundEffects, cssFilter, cascadingFilter} = generateFilters(this.item);

        data.effectFill = this.getEffectFill();
        data.svgFilters = svgFilters;
        data.filterUrl = filterUrl;
        data.cascadingFilter = cascadingFilter;
        data.backgroundEffects = backgroundEffects;
        data.foregroundEffects = foregroundEffects;
        data.shapeStyle = this.computeShapeStyle(cssFilter);

        return data;
    },

    methods: {
        computeShapeStyle(cssFilter) {
            const style = {
                opacity: this.item.selfOpacity/100
            };

            if (cssFilter) {
                style.filter = cssFilter;
            }

            return style;
        },

        onComponentLoadRequested(item) {
            if (this.item.meta.componentSchemeContainer && this.item.meta.componentUserEventBus) {
                EditorEventBus.component.loadRequested.specific.$emit(this.editorId, item.id, item, this.item.meta.componentSchemeContainer, this.item.meta.componentUserEventBus);
            } else {
                // pass it up the chain of items until we either hit the component item or we hit the main schemeContainer
                this.$emit('component-load-requested', item);
            }
        },

        onComponentMouseDown(event) {
            if (!this.eventListener || !this.item.meta.componentSchemeContainer || !this.item.meta.componentUserEventBus) {
                return null;
            }
            event.preventDefault();
            event.stopPropagation();
            this.eventListener.mouseDown(event, this.item);
        },

        onComponentMouseUp(event) {
            if (!this.eventListener || !this.item.meta.componentSchemeContainer || !this.item.meta.componentUserEventBus) {
                return null;
            }
            event.preventDefault();
            event.stopPropagation();
            this.eventListener.mouseUp(event, this.item);
        },

        onComponentMouseMove(event) {
            if (!this.eventListener || !this.item.meta.componentSchemeContainer || !this.item.meta.componentUserEventBus) {
                return null;
            }
            event.preventDefault();
            event.stopPropagation();
            this.eventListener.mouseMove(event, this.item);
        },

        getHoverPathFill() {
            if (this.draggingFileOver) {
                return 'rgba(140, 255, 140, 0.6)';
            }
            if (this.item.shape === 'path') {
                if (this.item.shapeProps.fill && this.item.shapeProps.fill.type === 'none') {
                    return 'none';
                }
            }
            if (this.item.shape === 'connector' && !this.item.shapeProps.thick) {
                return 'none';
            }
            return 'rgba(255, 255, 255, 0)';
        },

        onItemDragEnter(event) {
            if (this.mode === 'edit' && event.dataTransfer && this.$store.state.apiClient && this.$store.state.apiClient.uploadFile) {
                this.draggingFileOver = true;
            }
        },

        onItemDragOver(event) {
            if (this.mode === 'edit' && event.dataTransfer && this.$store.state.apiClient && this.$store.state.apiClient.uploadFile) {
                this.draggingFileOver = true;
            }
        },

        onItemDragLeave(event) {
            this.draggingFileOver = false;
        },

        onItemDrop(event) {
            this.draggingFileOver = false;
            event.preventDefault();

            if (this.mode !== 'edit' || !this.$store.state.apiClient || !this.$store.state.apiClient.uploadFile) {
                return;
            }

            let fileItems = [...event.dataTransfer.items].filter(item => item.kind === 'file');

            if (fileItems.length === 0) {
                return;
            }

            if (this.item.shape === 'link') {
                fileItems = [fileItems[0]];
            }

            fileItems.map(item => item.getAsFile())
            .map(file => {
                const title = file.name;
                StoreUtils.addInfoSystemMessage(this.$store, `Uploading file "${title}"...`, `file-uploading-${title}`, 'fas fa-spinner fa-spin fa-1x');
                return this.$store.state.apiClient.uploadFile(file)
                .then(url => {
                    if (this.item.shape === 'link') {
                        this.item.shapeProps.url = url;
                        this.item.shapeProps.icon = 'file';
                        StoreUtils.addInfoSystemMessage(this.$store, `Updated link url to ${url}`, `item-link-url-changed-${this.item.id}`)
                        EditorEventBus.item.changed.specific.$emit(this.editorId, this.item.id);
                        EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `items.${this.item.id}.links`);
                    } else {
                        if (!Array.isArray(this.item.links)) {
                            this.item.links = [];
                        }
                        this.item.links.push({
                            title, url, type: 'file'
                        });
                        StoreUtils.addInfoSystemMessage(this.$store, `Attached file "${title}" to item`, `item-link-url-changed-${this.item.id}-${title}`)
                        EditorEventBus.item.changed.specific.$emit(this.editorId, this.item.id, 'links');
                        EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `items.${this.item.id}.links`);
                    }
                })
                .catch(err => {
                    console.error(err);
                    if (err.response && err.response.data && err.response.data.message) {
                        StoreUtils.addErrorSystemMessage(this.$store, err.response.data.message, `item-upload-error-${title}`);
                    } else {
                        StoreUtils.addErrorSystemMessage(this.$store, 'Something went wrong, could not upload file', `item-upload-error-${title}`);
                    }
                    return null;
                });
            });
        },

        getEffectFill() {
            const shape = Shape.find(this.item.shape);
            if (!shape) {
                return null;
            }
            const shapeArgs = Shape.getShapeArgs(shape);
            const hasEffects = this.item.effects && this.item.effects.length > 0;
            if (!hasEffects) {
                return null;
            }
            if (this.item.shape === 'image') {
                return {
                    type: 'image',
                    image: this.item.shapeProps.image,
                    stretch: this.item.shapeProps.stretch,
                    imageBox: {
                        x: 0,
                        y: 0,
                        w: 1,
                        h: 1,
                    }
                };
            }
            if (shapeArgs.fill && shapeArgs.fill.type === 'advanced-color') {
                return this.item.shapeProps.fill;
            }
            return null;
        },

        calculateSVGItemTransform() {
            const m = myMath.standardTransformWithArea(myMath.identityMatrix(), this.item.area);
            return `matrix(${m[0][0]},${m[1][0]},${m[0][1]},${m[1][1]},${m[0][2]},${m[1][2]})`
        },

        switchShape(shapeId) {
            this.oldShape = this.item.shape;
            const shape = Shape.find(shapeId);
            if (!shape) {
                return;
            }
            this.shapeType = shape.shapeType;
            this.supportsStrokeSize = hasStrokeSizeProp(shape);

            this.customAreas = shape && shape.computeCustomAreas ? shape.computeCustomAreas(this.item) : [];
            if (shape.vueComponent) {
                this.shapeComponent = shape.vueComponent;
            } else {
                this.shapeComponent = null;
            }

            if (shape.shapeType === 'templated') {
                this.shapePrimitives = shape.computePrimitives(this.item);
            } else if (shape.shapeType === 'standard') {
                this.shapePrimitives = [{
                    fill         : this.item.shapeProps.fill,
                    strokeColor  : this.item.shapeProps.strokeColor,
                    strokeSize   : this.item.shapeProps.strokeSize,
                    strokePattern: this.item.shapeProps.strokePattern,
                    type         : 'path',
                    svgPath      : shape.computePath(this.item)
                }];
            }

            this.effectFill = this.getEffectFill();

            if (!(this.mode === 'view' && shape.editorProps && shape.editorProps.disableEventLayer)) {
                this.itemSvgOutlinePath = shape.computeOutline(this.item);
            }
        },

        computeStrokeDashArray(strokePattern, strokeSize) {
            return StrokePattern.createDashArray(strokePattern, strokeSize);
        },

        onItemDeselected() {
            this.isSelected = false;
        },

        onItemSelected() {
            this.isSelected = true;
        },

        onItemChanged(itemId, propertyPath) {
            this.hoverPathFill = this.getHoverPathFill();
            this.svgItemTransform = this.calculateSVGItemTransform();

            this.effectFill = this.getEffectFill();

            const shape = Shape.find(this.item.shape);
            if (!shape) {
                this.revision += 1;
                return;
            }
            this.hasDescription = hasItemDescription(this.item);
            this.hasLinks = Array.isArray(this.item.links) && this.item.links.length > 0;
            this.hasFiles = Array.isArray(this.item.links) && this.item.links.findIndex(link => link.type === 'file') >= 0;
            this.detailsMarker = shape.getDetailsMarker(this.item);

            if (this.oldShape !== this.item.shape) {
                this.switchShape(this.item.shape);
            } else if (shape) {
                // re-computing item svg path for event layer
                if (shape.shapeType === 'templated') {
                    this.shapePrimitives = shape.computePrimitives(this.item);
                } else if (shape.shapeType === 'standard') {
                    this.shapePrimitives = [{
                        fill         : this.item.shapeProps.fill,
                        strokeColor  : this.item.shapeProps.strokeColor,
                        strokeSize   : this.item.shapeProps.strokeSize,
                        strokePattern: this.item.shapeProps.strokePattern,
                        type         : 'path',
                        svgPath      : shape.computePath(this.item)
                    }];
                }

                if (!(this.mode === 'view' && shape.editorProps && shape.editorProps.disableEventLayer)) {
                    this.itemSvgOutlinePath = shape.computeOutline(this.item);
                }
                this.customAreas = shape && shape.computeCustomAreas ? shape.computeCustomAreas(this.item) : [];
            }

            if (!shape.editorProps || !shape.editorProps.customTextRendering) {
                this.textSlots = this.generateTextSlots();
            }

            //updating filters
            const {svgFilters, filterUrl, backgroundEffects, foregroundEffects, cssFilter, cascadingFilter} = generateFilters(this.item);
            this.svgFilters = svgFilters;
            this.filterUrl = filterUrl;
            this.backgroundEffects = backgroundEffects;
            this.foregroundEffects = foregroundEffects;
            this.cascadingFilter = cascadingFilter;

            this.shapeStyle = this.computeShapeStyle(cssFilter);
            this.revision += 1;
            this.$forceUpdate();
        },

        onFrameAnimatorEventInsideComponent(args, componentItem) {
            if (componentItem) {
                this.$emit('frame-animator', args, componentItem);
            } else {
                this.$emit('frame-animator', args, this.item);
            }
        },

        passThroughFrameAnimatorEvent(args, componentItem) {
            this.$emit('frame-animator', args, componentItem);
        },

        generateTextSlots() {
            const shape = Shape.find(this.item.shape);
            if (!shape) {
                return [];
            }
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

        onItemTextSlotEditCanceled(item, slotName) {
            this.$nextTick(() => {
                const shape = Shape.find(this.item.shape);
                if (shape && shape.onTextSlotTextUpdate) {
                    const element = this.$refs.textSlots.find(element => element.getAttribute('data-text-slot-name') === slotName);
                    if (!element) {
                        return;
                    }
                    shape.onTextSlotTextUpdate(this.$store, this.item, slotName, element);
                }
            });
        },

        computeSvgFill(fill, fillId) {
            return computeSvgFill(fill, fillId);
        }
    },

    computed: {
        hoverPathStrokeWidth() {
            if (this.draggingFileOver) {
                return '8px';
            }
            if (this.supportsStrokeSize) {
                return (parseInt(this.item.shapeProps.strokeSize) + 2)  + 'px';
            }
            return '0px';
        },
        hoverPathStroke() {
            if (this.draggingFileOver) {
                return 'rgba(130, 240, 130, 0.7)';
            }
            return 'rgba(255, 255, 255, 0)';
        },

        shouldBeDrawn() {
            if (!this.item.visible) {
                return false;
            }

            const shape = Shape.find(this.item.shape);
            if (!shape) {
                return false;
            }
            if (this.mode === 'view' && shape.editorProps && shape.editorProps.onlyEditMode) {
                return false;
            }
            return true;
        },

        componentChildrenLayerStyle() {
            if (this.item.clip || this.item.shape === 'component') {
                return {
                    'clip-path': `url(#item-clip-path-${this.item.id})`
                };
            }
            return {};
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
        },

        missingShapeTextStyle() {
            const fontSize = Math.min(this.item.area.w, this.item.area.h) / 6;
            return {
                'font-size': `${fontSize}px`,
                display: 'inline-block'
            };
        },

        showItemDetailMarkers() {
            return this.$store.getters.showItemDetailMarkers;
        },
    },

    watch: {
        draggingFileOver(value) {
            this.hoverPathFill = this.getHoverPathFill();
        }
    }
}
</script>

