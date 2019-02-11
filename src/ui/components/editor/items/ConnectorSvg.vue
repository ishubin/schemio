<template lang="html">
    <g>
        <path :d="svgPath" class="item-connector"
            :class="{selected: connector.meta.selected}"
            :stroke="connector.style.color"
            :stroke-width="connector.style.width" fill="none"
            :stroke-dasharray="strokeDashArray"
            stroke-linejoin="round"
        />
        <path :d="svgPath" :data-connector-index="sourceItem.id+'/'+connectorIndex" class="item-connector-hover-area" stroke-width="10" fill="none"/>

        <g v-for="end in ends">
            <circle v-if="end.type === 'circle'" :cx="end.x" :cy="end.y" :r="end.r" :fill="connector.style.color" class="item-connector" :class="{selected: connector.meta.selected}"/>
            <path v-if="end.type === 'path'"
                :d="end.path"
                class="item-connector"
                :class="{selected: connector.meta.selected}"
                :stroke="connector.style.color"
                :stroke-width="connector.style.width"
                :fill="end.fill"
                stroke-linejoin="round"
            />
        </g>

        <g v-for="(point, rerouteIndex) in connector.reroutes" v-if="showReroutes">
            <circle :cx="point.x" :cy="point.y" r="5"
                :data-reroute-index="sourceItem.id+'/'+connectorIndex +'/'+rerouteIndex"
                class="item-connector-reroute"
                :class="{selected: connector.meta.selected}"
                :fill="connector.style.color"
            />
        </g>

    </g>
</template>

<script>
import EventBus from '../EventBus.js';

export default {
    props: ['connector', 'offsetX', 'offsetY', 'zoom', 'showReroutes', 'connectorIndex', 'sourceItem'],

    mounted() {
        EventBus.subscribeForRedrawConnector(this.sourceItem.id, this.connector.itemId, this.onRedrawConnector);
        EventBus.$on(EventBus.ALL_CONNECTORS_DESELECTED, this.onAllConnectorsDeselected);
    },
    data() {
        return {
            svgPath: this.computeSvgPath(this.connector.meta.points),
            ends: this.computeEnds(this.connector)
        };
    },
    beforeDestroy(){
        EventBus.unsubscribeForRedrawConnector(this.sourceItem.id, this.connector.itemId);
        EventBus.$off(EventBus.ALL_CONNECTORS_DESELECTED, this.onAllConnectorsDeselected);
    },
    methods: {
        onRedrawConnector(connector) {
            this.recompute();
            this.$forceUpdate();
        },

        onAllConnectorsDeselected() {
            this.$forceUpdate();
        },

        createEnd(x, y, px, py, endStyle) {
            if (endStyle.type === 'circle') {
                return {
                    type: 'circle',
                    x: x,
                    y: y,
                    r: endStyle.size
                };
            } else if (endStyle.type === 'arrow') {
                return this.createArrowEnd(x, y, px, py, endStyle, false);
            } else if (endStyle.type === 'triangle') {
                return this.createArrowEnd(x, y, px, py, endStyle, true);
            }
            return null;
        },

        createArrowEnd(x, y, px, py, endStyle, close) {
            var Vx = px - x, Vy = py - y;
            var V = Vx * Vx + Vy * Vy;
            if (V !== 0) {
                V = Math.sqrt(V);
                Vx = Vx/V;
                Vy = Vy/V;

                var size = endStyle.size;
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
                    fill: close ? '#fff' : 'none'
                }
            }
            return null;
        },
        computeSvgPath(points) {
            var path = `M ${points[0].x} ${points[0].y}`

            for (var i = 1; i < points.length; i++) {
                path += ` L ${points[i].x} ${points[i].y}`
            }
            return path;
        },
        computeEnds(connector) {
            var ends = [];
            if (connector.meta && connector.meta.points.length > 0 && connector.style) {
                var points = connector.meta.points;

                if (connector.style.source) {
                    var end = this.createEnd(points[0].x, points[0].y, points[1].x, points[1].y, connector.style.source);
                    if (end) {
                        ends.push(end);
                    }
                }
                if (connector.style.destination) {
                    var end = this.createEnd(points[points.length - 1].x, points[points.length - 1].y, points[points.length - 2].x, points[points.length - 2].y, connector.style.destination);
                    if (end) {
                        ends.push(end);
                    }
                }
            }
            return ends;
        },
        recompute() {
            this.svgPath = this.computeSvgPath(this.connector.meta.points);
            this.ends = this.computeEnds(this.connector);
        }
    },
    watch: {
        connector: {
            deep: true,
            handler(connector) {
                this.svgPath = this.computeSvgPath(connector.meta.points);
                this.ends = this.computeEnds(connector);
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
    computed:{
        strokeDashArray() {
            var w = this.connector.style.width;
            if (this.connector.style.pattern === 'dotted') {
                return  w + ' ' + (w * 2);
            } else if (this.connector.style.pattern === 'dashed') {
                return (w * 4) + ' ' + (w * 4);
            }
            return '';
        }
    }
}
</script>

<style lang="css">
</style>
