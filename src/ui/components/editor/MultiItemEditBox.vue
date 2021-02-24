<template>
    <g>
        <g v-if="!isItemConnector" :transform="`translate(${editBox.area.x},${editBox.area.y}) rotate(${editBox.area.r})`">
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
                    :transform="`translate(${editBox.area.w/2 + 3/safeZoom}  ${editBox.area.h + 20/safeZoom}) scale(${1/safeZoom}) rotate(90)`"
                    :data-connector-starter-item-id="editBox.items[0].id"
                    :fill="boundaryBoxColor"
                    d="M 0 0  L 10 0  L 10 -3  L 20 3  L 10 9  L 10 6  L 0 6 Z"/>

                <path class="boundary-box-connector-starter"
                    :transform="`translate(${editBox.area.w/2 - 3/safeZoom}  ${-20/safeZoom}) scale(${1/safeZoom}) rotate(270)`"
                    :data-connector-starter-item-id="editBox.items[0].id"
                    :fill="boundaryBoxColor"
                    d="M 0 0  L 10 0  L 10 -3  L 20 3  L 10 9  L 10 6  L 0 6 Z"/>

                <path class="boundary-box-connector-starter"
                    :transform="`translate(${editBox.area.w + 20/safeZoom}  ${editBox.area.h/2 - 3/safeZoom}) scale(${1/safeZoom})`"
                    :data-connector-starter-item-id="editBox.items[0].id"
                    :fill="boundaryBoxColor"
                    d="M 0 0  L 10 0  L 10 -3  L 20 3  L 10 9  L 10 6  L 0 6 Z"/>

                <path class="boundary-box-connector-starter"
                    :transform="`translate(${-20/safeZoom}  ${editBox.area.h/2 + 3/safeZoom}) scale(${1/safeZoom}) rotate(180)`"
                    :data-connector-starter-item-id="editBox.items[0].id"
                    :fill="boundaryBoxColor"
                    d="M 0 0  L 10 0  L 10 -3  L 20 3  L 10 9  L 10 6  L 0 6 Z"/>
            </g>

            <rect class="boundary-box-dragger"
                data-type="multi-item-edit-box-resize-dragger"
                data-dragger-edges="top,left"
                :fill="boundaryBoxColor"
                :x="-2 * draggerSize / safeZoom"
                :y="-2 * draggerSize / safeZoom"
                :width="draggerSize * 2 / safeZoom"
                :height="draggerSize * 2 / safeZoom"
            />

            <rect class="boundary-box-dragger"
                data-type="multi-item-edit-box-resize-dragger"
                data-dragger-edges="top"
                :fill="boundaryBoxColor"
                :x="editBox.area.w / 2 - draggerSize / safeZoom"
                :y="-2 * draggerSize / safeZoom"
                :width="draggerSize * 2 / safeZoom"
                :height="draggerSize * 2 / safeZoom"
            />

            <rect class="boundary-box-dragger"
                data-type="multi-item-edit-box-resize-dragger"
                data-dragger-edges="top,right"
                :fill="boundaryBoxColor"
                :x="editBox.area.w"
                :y="-2 * draggerSize / safeZoom"
                :width="draggerSize * 2 / safeZoom"
                :height="draggerSize * 2 / safeZoom"
            />

            <rect class="boundary-box-dragger"
                data-type="multi-item-edit-box-resize-dragger"
                data-dragger-edges="left"
                :fill="boundaryBoxColor"
                :x="-2 * draggerSize / safeZoom"
                :y="editBox.area.h / 2 - draggerSize / safeZoom"
                :width="draggerSize * 2 / safeZoom"
                :height="draggerSize * 2 / safeZoom"
            />

            <rect class="boundary-box-dragger"
                data-type="multi-item-edit-box-resize-dragger"
                data-dragger-edges="right"
                :fill="boundaryBoxColor"
                :x="editBox.area.w"
                :y="editBox.area.h / 2 - draggerSize / safeZoom"
                :width="draggerSize * 2 / safeZoom"
                :height="draggerSize * 2 / safeZoom"
            />

            <rect class="boundary-box-dragger"
                data-type="multi-item-edit-box-resize-dragger"
                data-dragger-edges="bottom,left"
                :fill="boundaryBoxColor"
                :x="-2 * draggerSize / safeZoom"
                :y="editBox.area.h"
                :width="draggerSize * 2 / safeZoom"
                :height="draggerSize * 2 / safeZoom"
            />

            <rect class="boundary-box-dragger"
                data-type="multi-item-edit-box-resize-dragger"
                data-dragger-edges="bottom"
                :fill="boundaryBoxColor"
                :x="editBox.area.w / 2 - draggerSize / safeZoom"
                :y="editBox.area.h"
                :width="draggerSize * 2 / safeZoom"
                :height="draggerSize * 2 / safeZoom"
            />

            <rect class="boundary-box-dragger"
                data-type="multi-item-edit-box-resize-dragger"
                data-dragger-edges="bottom,right"
                :fill="boundaryBoxColor"
                :x="editBox.area.w"
                :y="editBox.area.h"
                :width="draggerSize * 2 / safeZoom"
                :height="draggerSize * 2 / safeZoom"
            />
        </g>

        <!-- rendering item custom control points -->
        <g v-if="editBox.items.length === 1"
            :transform="`translate(${editBox.items[0].meta.transform.x},${editBox.items[0].meta.transform.y}) rotate(${editBox.items[0].meta.transform.r})`">
            <g :transform="`translate(${editBox.items[0].area.x},${editBox.items[0].area.y}) rotate(${editBox.items[0].area.r})`">

                <path v-if="editBox.items[0].shape === 'connector' && selectedConnectorPath"
                    :d="selectedConnectorPath" 
                    stroke-width="3px"
                    :stroke="boundaryBoxColor"
                    style="stroke-linejoin: round;"
                    data-preview-ignore="true"
                    :data-item-id="editBox.items[0].id"
                    fill="none"/>

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

    </g>
</template>

<script>
import Shape from './items/shapes/Shape';
import StoreUtils from '../../store/StoreUtils';


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

    computed: {
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
        }
    }
}
</script>