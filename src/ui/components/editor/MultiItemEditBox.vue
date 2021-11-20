<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <g data-preview-ignore="true">
        <!-- rendering item custom control points -->
        <g v-if="editBox.items.length === 1">
            <g v-if="editBox.items[0].shape === 'connector' && selectedConnectorPath"
               :transform="svgItemCompleteTransform"
               >
                <path :d="selectedConnectorPath" 
                    :stroke-width="`${editBox.items[0].shapeProps.strokeSize + 3}px`"
                    :stroke="boundaryBoxColor"
                    style="stroke-linejoin: round;opacity: 0.6;"
                    data-preview-ignore="true"
                    :data-item-id="editBox.items[0].id"
                    fill="none"/>

                <path :d="selectedConnectorPath" 
                    :stroke-width="`${editBox.items[0].shapeProps.strokeSize}px`"
                    :stroke="editBox.items[0].shapeProps.strokeColor"
                    style="stroke-linejoin: round;"
                    data-preview-ignore="true"
                    :data-item-id="editBox.items[0].id"
                    :stroke-dasharray="createStrokeDashArray(editBox.items[0].shapeProps.strokePattern, editBox.items[0].shapeProps.strokeSize)"
                    fill="none"/>
            </g>

            <g :transform="svgEditBoxTransform">
                <circle v-if="shouldShowControlPoints" v-for="controlPoint in controlPoints"
                    :key="`item-control-point-${controlPoint.id}`"
                    class="item-control-point"
                    :data-control-point-item-id="editBox.items[0].id"
                    :data-control-point-id="controlPoint.id"
                    :cx="controlPoint.point.x" :cy="controlPoint.point.y"
                    :fill="controlPointsColor"
                    :r="6/safeZoom"
                    />
                <g v-if="!isItemConnector && editBox.items[0].shape === 'curve'" :transform="`translate(${10/safeZoom}, ${- 20/safeZoom}) scale(${1/safeZoom})`">
                    <foreignObject :x="0" :y="0" width="100" height="20">
                        <div>
                            <span class="link" data-type="multi-item-edit-box-edit-curve-link">Edit Curve</span>
                        </div>
                    </foreignObject>
                </g>
            </g>
        </g>

        <g v-if="!isItemConnector" :transform="svgEditBoxTransform">
            <path :d="`M 0 0 L ${editBox.area.w} 0  L ${editBox.area.w} ${editBox.area.h} L 0 ${editBox.area.h} Z`"
                data-type="multi-item-edit-box"
                :stroke-width="1/safeZoom"
                fill="none"
                :stroke="boundaryBoxColor"
                style="opacity: 0.8;"/>

            <ellipse class="boundary-box-dragger"
                data-type="multi-item-edit-box-rotational-dragger"
                :fill="boundaryBoxColor"
                :cx="editBox.area.w / 2"
                :cy="-60/safeZoom"
                :rx="5/safeZoom"
                :ry="5/safeZoom"
            />

            <g v-if="editBox.items.length === 1">
                <path class="boundary-box-connector-starter"
                    :transform="`translate(${editBox.area.w/2 + 3/safeZoom}  ${editBox.area.h + 30/safeZoom}) scale(${1/safeZoom}) rotate(90)`"
                    :data-connector-starter-item-id="editBox.items[0].id"
                    :fill="boundaryBoxColor"
                    d="M 0 0  L 10 0  L 10 -3  L 20 3  L 10 9  L 10 6  L 0 6 Z"/>

                <path class="boundary-box-connector-starter"
                    :transform="`translate(${editBox.area.w/2 - 3/safeZoom}  ${-30/safeZoom}) scale(${1/safeZoom}) rotate(270)`"
                    :data-connector-starter-item-id="editBox.items[0].id"
                    :fill="boundaryBoxColor"
                    d="M 0 0  L 10 0  L 10 -3  L 20 3  L 10 9  L 10 6  L 0 6 Z"/>

                <path class="boundary-box-connector-starter"
                    :transform="`translate(${editBox.area.w + 30/safeZoom}  ${editBox.area.h/2 - 3/safeZoom}) scale(${1/safeZoom})`"
                    :data-connector-starter-item-id="editBox.items[0].id"
                    :fill="boundaryBoxColor"
                    d="M 0 0  L 10 0  L 10 -3  L 20 3  L 10 9  L 10 6  L 0 6 Z"/>

                <path class="boundary-box-connector-starter"
                    :transform="`translate(${-30/safeZoom}  ${editBox.area.h/2 + 3/safeZoom}) scale(${1/safeZoom}) rotate(180)`"
                    :data-connector-starter-item-id="editBox.items[0].id"
                    :fill="boundaryBoxColor"
                    d="M 0 0  L 10 0  L 10 -3  L 20 3  L 10 9  L 10 6  L 0 6 Z"/>
            </g>

            <rect class="boundary-box-dragger"
                data-type="multi-item-edit-box-resize-dragger"
                data-dragger-edges="top,left"
                :fill="boundaryBoxColor"
                :x="-4 * draggerSize / safeZoom"
                :y="-4 * draggerSize / safeZoom"
                :width="draggerSize * 2 / safeZoom"
                :height="draggerSize * 2 / safeZoom"
            />

            <rect class="boundary-box-dragger"
                data-type="multi-item-edit-box-resize-dragger"
                data-dragger-edges="top"
                :fill="boundaryBoxColor"
                :x="editBox.area.w / 2 - draggerSize / safeZoom"
                :y="-4 * draggerSize / safeZoom"
                :width="draggerSize * 2 / safeZoom"
                :height="draggerSize * 2 / safeZoom"
            />

            <rect class="boundary-box-dragger"
                data-type="multi-item-edit-box-resize-dragger"
                data-dragger-edges="top,right"
                :fill="boundaryBoxColor"
                :x="editBox.area.w + 2 * draggerSize / safeZoom"
                :y="-4 * draggerSize / safeZoom"
                :width="draggerSize * 2 / safeZoom"
                :height="draggerSize * 2 / safeZoom"
            />

            <rect class="boundary-box-dragger"
                data-type="multi-item-edit-box-resize-dragger"
                data-dragger-edges="left"
                :fill="boundaryBoxColor"
                :x="-4 * draggerSize / safeZoom"
                :y="editBox.area.h / 2 - draggerSize / safeZoom"
                :width="draggerSize * 2 / safeZoom"
                :height="draggerSize * 2 / safeZoom"
            />

            <rect class="boundary-box-dragger"
                data-type="multi-item-edit-box-resize-dragger"
                data-dragger-edges="right"
                :fill="boundaryBoxColor"
                :x="editBox.area.w + 2 * draggerSize / safeZoom"
                :y="editBox.area.h / 2 - draggerSize / safeZoom"
                :width="draggerSize * 2 / safeZoom"
                :height="draggerSize * 2 / safeZoom"
            />

            <rect class="boundary-box-dragger"
                data-type="multi-item-edit-box-resize-dragger"
                data-dragger-edges="bottom,left"
                :fill="boundaryBoxColor"
                :x="-4 * draggerSize / safeZoom"
                :y="editBox.area.h + 2 * draggerSize / safeZoom"
                :width="draggerSize * 2 / safeZoom"
                :height="draggerSize * 2 / safeZoom"
            />

            <rect class="boundary-box-dragger"
                data-type="multi-item-edit-box-resize-dragger"
                data-dragger-edges="bottom"
                :fill="boundaryBoxColor"
                :x="editBox.area.w / 2 - draggerSize / safeZoom"
                :y="editBox.area.h + 2 * draggerSize / safeZoom"
                :width="draggerSize * 2 / safeZoom"
                :height="draggerSize * 2 / safeZoom"
            />

            <rect class="boundary-box-dragger"
                data-type="multi-item-edit-box-resize-dragger"
                data-dragger-edges="bottom,right"
                :fill="boundaryBoxColor"
                :x="editBox.area.w + 2 * draggerSize / safeZoom"
                :y="editBox.area.h + 2 * draggerSize / safeZoom"
                :width="draggerSize * 2 / safeZoom"
                :height="draggerSize * 2 / safeZoom"
            />

            <g class="boundary-box-pivot-dragger" v-if="showPivot">
                <line 
                    :x1="editBox.area.w * editBox.pivotPoint.x" 
                    :y1="editBox.area.h * editBox.pivotPoint.y - 10/safeZoom" 
                    :x2="editBox.area.w * editBox.pivotPoint.x" 
                    :y2="editBox.area.h * editBox.pivotPoint.y + 10/safeZoom" 
                    :stroke="boundaryBoxColor" 
                    :stroke-width="1/safeZoom"
                />
                <line 
                    :x1="editBox.area.w * editBox.pivotPoint.x - 10/safeZoom" 
                    :y1="editBox.area.h * editBox.pivotPoint.y" 
                    :x2="editBox.area.w * editBox.pivotPoint.x + 10/safeZoom" 
                    :y2="editBox.area.h * editBox.pivotPoint.y" 
                    :stroke="boundaryBoxColor" 
                    :stroke-width="1/safeZoom"
                />

                <circle
                    data-type="multi-item-edit-box-pivot-dragger"
                    fill="rgba(255,255,255,0.0)"
                    :stroke="boundaryBoxColor"
                    :stroke-width="1/safeZoom"
                    :cx="editBox.area.w * editBox.pivotPoint.x"
                    :cy="editBox.area.h * editBox.pivotPoint.y"
                    :r="10/safeZoom"
                />
            </g>
        </g>


    </g>
</template>

<script>
import Shape from './items/shapes/Shape';
import StoreUtils from '../../store/StoreUtils';
import StrokePattern from './items/StrokePattern';
import myMath from '../../myMath';
import { itemCompleteTransform } from '../../scheme/SchemeContainer';


function isItemConnector(items) {
    return items.length === 1 && items[0].shape === 'connector';
}

export default {
    props: ['editBox', 'zoom', 'boundaryBoxColor', 'controlPointsColor'],

    beforeMount() {
        // reseting selected connector if it was set previously
        StoreUtils.setSelectedConnectorPath(this.$store, null);

        if (this.editBox.items.length === 1) {
            const item = this.editBox.items[0];
            if (item.shape === 'connector') {
                const shape = Shape.find(item.shape);
                StoreUtils.setSelectedConnectorPath(this.$store, shape.computeOutline(item));
            }

            StoreUtils.setItemControlPoints(this.$store, item);
        } else {
            StoreUtils.clearItemControlPoints(this.$store);
        }
    },

    data() {
        return {
            draggerSize: 5,
        };
    },

    methods: {
        createStrokeDashArray(pattern, strokeSize) {
            return StrokePattern.createDashArray(pattern, strokeSize);
        }
    },

    computed: {
        svgItemCompleteTransform() {
            const m = itemCompleteTransform(this.editBox.items[0]);
            return `matrix(${m[0][0]},${m[1][0]},${m[0][1]},${m[1][1]},${m[0][2]},${m[1][2]})`
        },


        svgEditBoxTransform() {
            const m = myMath.standardTransformWithArea(myMath.identityMatrix(), this.editBox.area);
            return `matrix(${m[0][0]},${m[1][0]},${m[0][1]},${m[1][1]},${m[0][2]},${m[1][2]})`
        },

        safeZoom() {
            if (this.zoom > 0.001) {
                return this.zoom;
            }
            return 1.0;
        },

        controlPoints() {
            return this.$store.getters.itemControlPointsList;
        },

        isItemConnector() {
            return isItemConnector(this.editBox.items);
        },

        shouldShowControlPoints() {
            if (this.editBox.items.length === 1) {
                const item = this.editBox.items[0];
                if (item.shape === 'curve') {
                    return false;
                }
                return true;
            }
            return false;
        },

        selectedConnectorPath() {
            return this.$store.getters.selectedConnectorPath;
        },

        showPivot() {
            return this.$store.getters.showPivot;
        }
    }
}
</script>