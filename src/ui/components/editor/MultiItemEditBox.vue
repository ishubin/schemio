<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <g data-preview-ignore="true">
        <path v-if="!isItemConnector" :transform="svgEditBoxTransform"
            :d="`M 0 0 L ${editBox.area.w} 0  L ${editBox.area.w} ${editBox.area.h} L 0 ${editBox.area.h} Z`"
            data-type="multi-item-edit-box"
            :stroke-width="1/safeZoom"
            fill="none"
            :stroke="boundaryBoxColor"
            style="opacity: 0.8;"/>
        <!-- rendering item custom control points -->
        <g v-if="editBox.items.length === 1 && kind === 'regular'">
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

            <g :transform="svgEditBoxTransform" v-if="shouldShowControlPoints">
                <circle v-for="controlPoint in controlPoints"
                    :key="`item-control-point-${controlPoint.id}`"
                    class="item-control-point"
                    :data-control-point-item-id="editBox.items[0].id"
                    :data-control-point-id="controlPoint.id"
                    :cx="controlPoint.point.x" :cy="controlPoint.point.y"
                    :fill="controlPointsColor"
                    :r="6/safeZoom"
                    />

                <g v-for="(control, idx) in customControls"
                    :transform="`translate(${editBox.area.w * control.xAxis.widthFactor + control.xAxis.direction * (control.position.x * control.xAxis.scaleFactor / safeZoom + control.position.x * (1 - control.xAxis.scaleFactor))}, ${editBox.area.h * control.yAxis.widthFactor + control.yAxis.direction * (control.position.y * control.yAxis.scaleFactor / safeZoom + control.position.y * (1 - control.yAxis.scaleFactor))})`"
                    >
                    <circle class="item-control-point"
                        :cx="0"
                        :cy="0"
                        :r="10/safeZoom"
                        :fill="controlPointsColor"
                        >
                    </circle>
                    <foreignObject :x="-10/safeZoom" :y="-10/safeZoom"  :width="20/safeZoom" :height="20/safeZoom">
                        <div xmlns="http://www.w3.org/1999/xhtml"
                            style="color: white; display: table-cell; text-align: center; vertical-align: middle"
                            :style="{'font-size': `${12/safeZoom}px`,width: `${Math.round(20/safeZoom)}px`, height: `${Math.round(20/safeZoom)}px`}"
                            >
                            <i :class="control.iconClass"></i>
                        </div>
                    </foreignObject>
                    <circle class="item-control-point"
                        :cx="0"
                        :cy="0"
                        :r="10/safeZoom"
                        fill="rgba(255, 255, 255, 0.0)"
                        :title="control.name"
                        data-type="multi-item-edit-box"
                        @click="onCustomControlClick(idx)"
                        >
                    </circle>
                </g>
            </g>
        </g>

        <g v-if="!isItemConnector" :transform="svgEditBoxTransform">
            <ellipse v-if="kind === 'regular'" class="boundary-box-dragger"
                data-type="multi-item-edit-box-rotational-dragger"
                :fill="boundaryBoxColor"
                :cx="editBox.area.w / 2"
                :cy="-60/safeZoom"
                :rx="5/safeZoom"
                :ry="5/safeZoom"
            />

            <transition name="edit-box-controls" v-if="editBox.items.length === 1 && kind === 'regular' && connectionStarterDisplayed">
                <g>
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
            </transition>

            <g v-if="kind === 'regular'">
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
            <g v-else-if="kind === 'crop-image'">
                <g :transform="`translate(${10/safeZoom}, ${-20/safeZoom}) scale(${1/safeZoom})`">
                    <foreignObject :x="0" :y="0" width="100" height="20">
                        <div>
                            <span class="link" data-type="multi-item-edit-box-reset-image-crop-link">Reset</span>
                        </div>
                    </foreignObject>
                </g>
                <path :transform="`translate(${editBox.area.w/2}, 0) rotate(0)`" :d="`M ${-cdsB} ${-cds} L ${cdsB} ${-cds}  L ${cdsB} ${cds} L ${-cdsB} ${cds} Z`"
                    class="boundary-box-dragger"
                    data-type="multi-item-edit-box-resize-dragger"
                    data-dragger-edges="top"
                    :fill="boundaryBoxColor"
                    stroke="rgba(255,255,255,1.0)"
                    :stroke-width="`${1/safeZoom}px`"
                />
                <path :transform="`translate(${editBox.area.w}, ${editBox.area.h/2}) rotate(90)`" :d="`M ${-cdsB} ${-cds} L ${cdsB} ${-cds}  L ${cdsB} ${cds} L ${-cdsB} ${cds} Z`"
                    class="boundary-box-dragger"
                    data-type="multi-item-edit-box-resize-dragger"
                    data-dragger-edges="right"
                    :fill="boundaryBoxColor"
                    stroke="rgba(255,255,255,1.0)"
                    :stroke-width="`${1/safeZoom}px`"
                />
                <path :transform="`translate(${editBox.area.w/2}, ${editBox.area.h}) rotate(0)`" :d="`M ${-cdsB} ${-cds} L ${cdsB} ${-cds}  L ${cdsB} ${cds} L ${-cdsB} ${cds} Z`"
                    class="boundary-box-dragger"
                    data-type="multi-item-edit-box-resize-dragger"
                    data-dragger-edges="bottom"
                    :fill="boundaryBoxColor"
                    stroke="rgba(255,255,255,1.0)"
                    :stroke-width="`${1/safeZoom}px`"
                />
                <path :transform="`translate(0, ${editBox.area.h/2}) rotate(90)`" :d="`M ${-cdsB} ${-cds} L ${cdsB} ${-cds}  L ${cdsB} ${cds} L ${-cdsB} ${cds} Z`"
                    class="boundary-box-dragger"
                    data-type="multi-item-edit-box-resize-dragger"
                    data-dragger-edges="left"
                    :fill="boundaryBoxColor"
                    stroke="rgba(255,255,255,1.0)"
                    :stroke-width="`${1/safeZoom}px`"
                />
                <path :d="`M ${-cds} ${-cds} L ${cdsB} ${-cds} L ${cdsB} ${cds} L ${cds} ${cds} L ${cds} ${cdsB} L ${-cds} ${cdsB} Z`"
                    class="boundary-box-dragger"
                    data-type="multi-item-edit-box-resize-dragger"
                    data-dragger-edges="top,left"
                    :fill="boundaryBoxColor"
                    stroke="rgba(255,255,255,1.0)"
                    :stroke-width="`${1/safeZoom}px`"
                />
                <path :transform="`translate(${editBox.area.w}, 0) rotate(90)`" :d="`M ${-cds} ${-cds} L ${cdsB} ${-cds} L ${cdsB} ${cds} L ${cds} ${cds} L ${cds} ${cdsB} L ${-cds} ${cdsB} Z`"
                    class="boundary-box-dragger"
                    data-type="multi-item-edit-box-resize-dragger"
                    data-dragger-edges="top,right"
                    :fill="boundaryBoxColor"
                    stroke="rgba(255,255,255,1.0)"
                    :stroke-width="`${1/safeZoom}px`"
                />
                <path :transform="`translate(${editBox.area.w}, ${editBox.area.h}) rotate(180)`" :d="`M ${-cds} ${-cds} L ${cdsB} ${-cds} L ${cdsB} ${cds} L ${cds} ${cds} L ${cds} ${cdsB} L ${-cds} ${cdsB} Z`"
                    class="boundary-box-dragger"
                    data-type="multi-item-edit-box-resize-dragger"
                    data-dragger-edges="bottom,right"
                    :fill="boundaryBoxColor"
                    stroke="rgba(255,255,255,1.0)"
                    :stroke-width="`${1/safeZoom}px`"
                />
                <path :transform="`translate(0, ${editBox.area.h}) rotate(-90)`" :d="`M ${-cds} ${-cds} L ${cdsB} ${-cds} L ${cdsB} ${cds} L ${cds} ${cds} L ${cds} ${cdsB} L ${-cds} ${cdsB} Z`"
                    class="boundary-box-dragger"
                    data-type="multi-item-edit-box-resize-dragger"
                    data-dragger-edges="bottom,left"
                    :fill="boundaryBoxColor"
                    stroke="rgba(255,255,255,1.0)"
                    :stroke-width="`${1/safeZoom}px`"
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

function createCustomControlAxis(place) {
    if (place === 'right' || place === 'bottom') {
        return {
            widthFactor: 1,
            direction: 1,
            scaleFactor: 1
        };
    } else if (place === 'left' || place === 'top') {
        return {
            widthFactor: 0,
            direction: -1,
            scaleFactor: 1
        };
    }
    return {
        widthFactor: 0,
        direction: 1,
        scaleFactor: 0
    };
}

export default {
    props: {
        editorId: {type: String, required: true},
        cursor: {type: Object},
        editBox: {type: Object, required: true},
        zoom: {type: Number},
        boundaryBoxColor: {type: String},
        controlPointsColor: {type: String},

        // can be regular or crop-image
        kind: {type: String, default: 'regular'},
    },

    beforeMount() {
        // reseting selected connector if it was set previously
        StoreUtils.setSelectedConnectorPath(this.$store, null);

        if (this.editBox.items.length === 1) {
            const item = this.editBox.items[0];
            const shape = Shape.find(item.shape);

            this.configureCustomControls(item, shape.editorProps);

            if (item.shape === 'connector') {
                StoreUtils.setSelectedConnectorPath(this.$store, shape.computeOutline(item));
            }

            StoreUtils.setItemControlPoints(this.$store, item);
        } else {
            StoreUtils.clearItemControlPoints(this.$store);
        }
    },

    mounted() {
        this.onCursorChange(this.cursor);
    },

    beforeDestroy() {
        this.clearConnectionStarterTimeout();
    },

    data() {
        return {
            draggerSize: 5,
            connectionStarterDisplayed: false,
            connectionStarterTimerId: null,

            customControls: []
        };
    },

    methods: {
        createStrokeDashArray(pattern, strokeSize) {
            return StrokePattern.createDashArray(pattern, strokeSize);
        },

        clearConnectionStarterTimeout() {
            if (this.connectionStarterTimerId) {
                clearTimeout(this.connectionStarterTimerId);
            }
        },

        hideConnectionStarter() {
            this.clearConnectionStarterTimeout();
            this.connectionStarterTimerId = setTimeout(() => {
                this.connectionStarterDisplayed = false;
                this.connectionStarterTimerId = null;
            }, 500);
        },

        onCursorChange(p) {
            const localPoint = myMath.localPointInArea(p.x, p.y, this.editBox.area, null);
            if (localPoint.x >= 0 && localPoint.x <= this.editBox.area.w
                && localPoint.y >= 0 && localPoint.y <= this.editBox.area.h
            ) {
                this.connectionStarterDisplayed = true;
                this.clearConnectionStarterTimeout();
            } else {
                this.hideConnectionStarter();
            }
        },

        configureCustomControls(item, editorProps) {
            if (!editorProps || !editorProps.editBoxControls) {
                return;
            }

            editorProps.editBoxControls(this.editorId, item).forEach(control => {
                this.customControls.push({
                    ...control,
                    xAxis: createCustomControlAxis(control.hPlace),
                    yAxis: createCustomControlAxis(control.vPlace),
                });
            });
        },

        onCustomControlClick(idx) {
            this.customControls[idx].click();
            this.$emit('custom-control-clicked', this.editBox.items[0]);
        }
    },

    watch: {
        cursor(p) {
            this.onCursorChange(p);
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

        //crop dragger size
        cds() {
            if (this.zoom > 0.001) {
                return 0.7 * this.draggerSize / this.zoom;
            }
            return 0.7 * this.draggerSize;
        },

        //crop dragger size big (how wide it should be)
        cdsB() {
            if (this.zoom > 0.001) {
                return 3 * this.draggerSize / this.zoom;
            }
            return 3 * this.draggerSize;
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
                if (item.shape === 'path') {
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