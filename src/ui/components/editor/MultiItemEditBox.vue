<template>
    <g>
        <!-- rendering item custom control points -->
        <g v-if="editBox.items.length === 1"
            :transform="`translate(${editBox.items[0].meta.transform.x},${editBox.items[0].meta.transform.y}) rotate(${editBox.items[0].meta.transform.r})`">
            <g :transform="`translate(${editBox.items[0].area.x},${editBox.items[0].area.y}) rotate(${editBox.items[0].area.r})`">
                <circle v-for="(controlPoint, controlPointName) in editBox.items[0].meta.controlPoints"
                    class="item-control-point"
                    :data-control-point-item-id="editBox.items[0].id"
                    :data-control-point-id="controlPointName"
                    :cx="controlPoint.x" :cy="controlPoint.y"
                    :fill="boundaryBoxColor"
                    :r="5/safeZoom"
                    />
            </g>
            <g v-if="editBox.items[0].shape === 'curve'" :transform="`translate(${editBox.area.x + 10/safeZoom}, ${editBox.area.y - 20/safeZoom}) scale(${1/safeZoom})`">
                <foreignObject :x="0" :y="0" width="100" height="20">
                    <div>
                        <span class="link"
                            data-type="multi-item-edit-box-edit-curve-link"
                            :data-multi-item-edit-box-id="editBox.id">
                            Edit Curve</span>
                    </div>
                </foreignObject>
            </g>
        </g>

        <g :transform="`translate(${editBox.area.x},${editBox.area.y}) rotate(${editBox.area.r})`">
            <path :d="`M 0 0 L ${editBox.area.w} 0  L ${editBox.area.w} ${editBox.area.h} L 0 ${editBox.area.h} Z`"
                data-type="multi-item-edit-box"
                :data-multi-item-edit-box-id="editBox.id"
                :stroke-width="1/safeZoom"
                fill="none"
                :stroke="boundaryBoxColor"
                style="opacity: 0.8;"/>

            <ellipse class="boundary-box-dragger"
                data-type="multi-item-edit-box-rotational-dragger"
                :data-multi-item-edit-box-id="editBox.id"
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
                :data-multi-item-edit-box-id="editBox.id"
                :fill="boundaryBoxColor"
                :x="-2 * draggerSize / safeZoom"
                :y="-2 * draggerSize / safeZoom"
                :width="draggerSize * 2 / safeZoom"
                :height="draggerSize * 2 / safeZoom"
            />

            <rect class="boundary-box-dragger"
                data-type="multi-item-edit-box-resize-dragger"
                data-dragger-edges="top"
                :data-multi-item-edit-box-id="editBox.id"
                :fill="boundaryBoxColor"
                :x="editBox.area.w / 2 - draggerSize / safeZoom"
                :y="-2 * draggerSize / safeZoom"
                :width="draggerSize * 2 / safeZoom"
                :height="draggerSize * 2 / safeZoom"
            />

            <rect class="boundary-box-dragger"
                data-type="multi-item-edit-box-resize-dragger"
                data-dragger-edges="top,right"
                :data-multi-item-edit-box-id="editBox.id"
                :fill="boundaryBoxColor"
                :x="editBox.area.w"
                :y="-2 * draggerSize / safeZoom"
                :width="draggerSize * 2 / safeZoom"
                :height="draggerSize * 2 / safeZoom"
            />

            <rect class="boundary-box-dragger"
                data-type="multi-item-edit-box-resize-dragger"
                data-dragger-edges="left"
                :data-multi-item-edit-box-id="editBox.id"
                :fill="boundaryBoxColor"
                :x="-2 * draggerSize / safeZoom"
                :y="editBox.area.h / 2 - draggerSize / safeZoom"
                :width="draggerSize * 2 / safeZoom"
                :height="draggerSize * 2 / safeZoom"
            />

            <rect class="boundary-box-dragger"
                data-type="multi-item-edit-box-resize-dragger"
                data-dragger-edges="right"
                :data-multi-item-edit-box-id="editBox.id"
                :fill="boundaryBoxColor"
                :x="editBox.area.w"
                :y="editBox.area.h / 2 - draggerSize / safeZoom"
                :width="draggerSize * 2 / safeZoom"
                :height="draggerSize * 2 / safeZoom"
            />

            <rect class="boundary-box-dragger"
                data-type="multi-item-edit-box-resize-dragger"
                data-dragger-edges="bottom,left"
                :data-multi-item-edit-box-id="editBox.id"
                :fill="boundaryBoxColor"
                :x="-2 * draggerSize / safeZoom"
                :y="editBox.area.h"
                :width="draggerSize * 2 / safeZoom"
                :height="draggerSize * 2 / safeZoom"
            />

            <rect class="boundary-box-dragger"
                data-type="multi-item-edit-box-resize-dragger"
                data-dragger-edges="bottom"
                :data-multi-item-edit-box-id="editBox.id"
                :fill="boundaryBoxColor"
                :x="editBox.area.w / 2 - draggerSize / safeZoom"
                :y="editBox.area.h"
                :width="draggerSize * 2 / safeZoom"
                :height="draggerSize * 2 / safeZoom"
            />

            <rect class="boundary-box-dragger"
                data-type="multi-item-edit-box-resize-dragger"
                data-dragger-edges="bottom,right"
                :data-multi-item-edit-box-id="editBox.id"
                :fill="boundaryBoxColor"
                :x="editBox.area.w"
                :y="editBox.area.h"
                :width="draggerSize * 2 / safeZoom"
                :height="draggerSize * 2 / safeZoom"
            />

        </g>
    </g>
</template>

<script>
import utils from '../../utils';
import forEach from 'lodash/forEach';


export default {
    props: ['editBox', 'zoom', 'boundaryBoxColor'],

    data() {
        return {
            draggerSize: 5
        };
    },

    computed: {
        safeZoom() {
            if (this.zoom > 0.001) {
                return this.zoom;
            }
            return 1.0;
        }
    }
}
</script>