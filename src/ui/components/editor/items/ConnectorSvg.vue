<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <g :style="{'opacity': connector.opacity/100.0}">

        <path :id="`connector-${connector.id}-path`" :d="svgPath" class="item-connector"
            :class="{selected: selected}"
            :stroke="connector.color"
            :stroke-width="connector.width" fill="none"
            :stroke-dasharray="strokeDashArray"
            stroke-linejoin="round"
        />

        <g v-for="end in ends">
            <circle v-if="end.type === 'circle'" :cx="end.x" :cy="end.y" :r="end.r" :fill="connector.color" class="item-connector" :class="{selected: selected}"/>
            <path v-if="end.type === 'path'"
                :d="end.path"
                class="item-connector"
                :class="{selected: selected}"
                :stroke="connector.color"
                :stroke-width="connector.width"
                :fill="end.fill"
                stroke-linejoin="round"
            />
        </g>

        <path :d="svgPath" :data-connector-index="sourceItem.id+'/'+connectorIndex" class="item-connector-hover-area" :stroke-width="connector.width + 3" fill="rgba(0,0,0,0.0)"/>
        <g v-for="end in ends">
            <circle v-if="end.type === 'circle'"
                :data-connector-index="sourceItem.id+'/'+connectorIndex"
                :cx="end.x" :cy="end.y"
                :r="end.r"
                fill="rgba(0,0,0,0.0)"
                class="item-connector-hover-area"
                :class="{selected: selected}"/>
            <path v-if="end.type === 'path'"
                :d="end.path"
                :data-connector-index="sourceItem.id+'/'+connectorIndex"
                class="item-connector-hover-area"
                :class="{selected: selected}"
                :stroke="connector.color"
                :stroke-width="connector.width"
                fill="rgba(0,0,0,0.0)"
                stroke-linejoin="round"
            />
        </g>

        <g v-for="(point, rerouteIndex) in connector.reroutes" v-if="showReroutes && selected" data-preview-ignore="true">
            <circle :cx="point.x" :cy="point.y" r="5"
                :data-reroute-index="sourceItem.id+'/'+connectorIndex +'/'+rerouteIndex"
                class="item-connector-reroute"
                :class="{selected: selected}"
                :fill="connector.color"
            />
        </g>

        <g :id="`animation-container-connector-${connector.id}`"></g>

    </g>
</template>

<script>
import EventBus from '../EventBus.js';
import Connector from '../../../scheme/Connector.js';
import _ from 'lodash';

export default {
    props: ['connector', 'offsetX', 'offsetY', 'zoom', 'showReroutes', 'connectorIndex', 'sourceItem'],

    mounted() {
        this.generateStrokeDashArray();
        EventBus.$on(EventBus.ANY_CONNECTOR_SELECTED, this.onAnyConnectorSelected);
        EventBus.$on(EventBus.ANY_ITEM_SELECTED, this.onAnyItemSelected);
        EventBus.subscribeForConnectorChanged(this.connector.id, this.onConnectorChanged);
        EventBus.subscribeForConnectorSelected(this.connector.id, this.onConnectorSelected);
        EventBus.subscribeForConnectorDeselected(this.connector.id, this.onConnectorDeselected);
    },
    beforeDestroy(){
        EventBus.$off(EventBus.ANY_CONNECTOR_SELECTED, this.onAnyConnectorSelected);
        EventBus.$off(EventBus.ANY_ITEM_SELECTED, this.onAnyItemSelected);
        EventBus.unsubscribeForConnectorChanged(this.connector.id, this.onConnectorChanged);
        EventBus.unsubscribeForConnectorSelected(this.connector.id, this.onConnectorSelected);
        EventBus.unsubscribeForConnectorDeselected(this.connector.id, this.onConnectorDeselected);
    },
    data() {
        return {
            svgPath: this.computeSvgPath(this.connector.meta.points),
            ends: this.computeCaps(this.connector),
            strokeDashArray: '',
            selected: false
        };
    },
    methods: {
        onConnectorChanged() {
            this.recompute();
            this.generateStrokeDashArray();
            this.$forceUpdate();
        },

        onAnyItemSelected() {
            this.selected = false;
        },

        onConnectorSelected() {
            this.selected = true;
        },

        onConnectorDeselected() {
            this.selected = false;
        },

        onAnyConnectorSelected(connectorId) {
            if (this.connector.id !== connectorId) {
                this.selected = false;
            }
        },

        createCap(x, y, px, py, capStyle) {
            if (capStyle.type === Connector.CapType.CIRCLE) {
                return {
                    type: 'circle',
                    x: x,
                    y: y,
                    r: capStyle.size
                };
            } else if (capStyle.type === Connector.CapType.ARROW) {
                return this.createArrowCap(x, y, px, py, capStyle, false);
            } else if (capStyle.type === Connector.CapType.TRIANGLE) {
                return this.createArrowCap(x, y, px, py, capStyle, true);
            }
            return null;
        },

        createArrowCap(x, y, px, py, capStyle, close) {
            var Vx = px - x, Vy = py - y;
            var V = Vx * Vx + Vy * Vy;
            if (V !== 0) {
                V = Math.sqrt(V);
                Vx = Vx/V;
                Vy = Vy/V;

                var size = capStyle.size;
                var Pax = x + (Vx * 2 - Vy) * size;
                var Pay = y + (Vy * 2 + Vx) * size;
                var Pbx = x + (Vx * 2 + Vy) * size;
                var Pby = y + (Vy * 2 - Vx) * size;
                var path = `M ${Pax} ${Pay} L ${x} ${y} L ${Pbx} ${Pby}`;
                if (close) {
                    path += ' z';
                }
                return {
                    type: 'path',
                    path: path,
                    fill: close ? this.connector.color : 'none'
                }
            }
            return null;
        },

        computeStraightSvgPath(points) {
            let path = `M ${points[0].x} ${points[0].y}`

            for (var i = 1; i < points.length; i++) {
                path += ` L ${points[i].x} ${points[i].y}`;
            }
            return path;
        },

        controlPoint(current, p1, p2) {
            const smoothing = 0.1;
            return {
                x: current.x + (p1.x - p2.x) * smoothing,
                y: current.y + (p1.y - p2.y) * smoothing
            };
        },

        bezierCurve(points, i) {
            const previous      = points[i - 1] || points[i];
            const prePrevious   = points[i - 2] || points[i];
            const next          = points[i + 1] || points[i];
            const cpStart       = this.controlPoint(previous, points[i], prePrevious);
            const cpEnd         = this.controlPoint(points[i], previous, next);
            return `C ${cpStart.x},${cpStart.y} ${cpEnd.x},${cpEnd.y} ${points[i].x},${points[i].y}`;
        },

        computeSmoothSvgPath(points) {
            let path = ''; 

            _.forEach(points, (point, i) => {
                if (i === 0) {
                    path = `M ${points[0].x} ${points[0].y}`;
                } else {
                    path = `${path} ${this.bezierCurve(points, i)}`;
                }
            });
            return path;
        },

        computeSvgPath(points) {
            if (points.length < 2) {
                return '';
            }

            if (this.connector.connectorType === Connector.Type.SMOOTH) {
                return this.computeSmoothSvgPath(points);
            }
            return this.computeStraightSvgPath(points);
        },

        computeCaps(connector) {
            var ends = [];
            if (connector.meta && connector.meta.points.length > 0 && connector) {
                var points = connector.meta.points;

                if (connector.source) {
                    var end = this.createCap(points[0].x, points[0].y, points[1].x, points[1].y, connector.source);
                    if (end) {
                        ends.push(end);
                    }
                }
                if (connector.destination) {
                    var end = this.createCap(points[points.length - 1].x, points[points.length - 1].y, points[points.length - 2].x, points[points.length - 2].y, connector.destination);
                    if (end) {
                        ends.push(end);
                    }
                }
            }
            return ends;
        },
        recompute() {
            this.svgPath = this.computeSvgPath(this.connector.meta.points);
            this.ends = this.computeCaps(this.connector);
        },
        generateStrokeDashArray() {
            this.strokeDashArray = Connector.Pattern.generateStrokeDashArray(this.connector.patter, this.connector.width);
        },
    },
    watch: {
        connector: {
            deep: true,
            handler(connector) {
                this.svgPath = this.computeSvgPath(connector.meta.points);
                this.ends = this.computeCaps(connector);
            }
        },
        offsetX(value) {
            this.recompute()
        },
        offsetY(value) {
            this.recompute()
        },
        zoom(value) {
            this.recompute()
        }
    },
}
</script>

<style lang="css">
</style>
