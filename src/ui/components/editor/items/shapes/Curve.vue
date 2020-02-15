<template>
    <g>
        <path :d="shapePath" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :stroke-dasharray="strokeDashArray"
            :fill="fill"></path>
    </g>
</template>

<script>
import {forEach} from 'lodash';
import StrokePattern from '../StrokePattern.js';
import EventBus from '../../EventBus';


function connectPoints(p1, p2) {
    if (p1.t === 'L' && p2.t === 'B') {
        return `Q ${p2.x1} ${p2.y1} ${p2.x} ${p2.y} `;
    } else if (p1.t === 'B' && p2.t === 'L') {
        return `Q ${p1.x2} ${p1.y2} ${p2.x} ${p2.y} `;
    } else if (p1.t === 'B' && p2.t === 'B') {
        return `C ${p1.x2} ${p1.y2} ${p2.x1} ${p2.y1} ${p2.x} ${p2.y} `;
    }
    return `L ${p2.x} ${p2.y} `;
}

function computePath(item) {
    if (item.shapeProps && item.shapeProps.points) {
        let path = null;
        let prevPoint = null;
        forEach(item.shapeProps.points, point => {
            if (path) {
                path += connectPoints(prevPoint, point);
            } else {
                path = `M ${point.x} ${point.y} `;
            }
            prevPoint = point;
        });
        if (item.shapeProps.closed && item.shapeProps.points.length > 2) {
            path += connectPoints(item.shapeProps.points[item.shapeProps.points.length - 1], item.shapeProps.points[0]);
            path += ' Z';
        }
        return path;
    }
    return `M 0 0`;
};

export default {
    props: ['item', 'hiddenTextProperty'],

    computePath,

    editorProps: {
        description: 'rich',
        text: 'none'
    },

    args: {
        strokeColor: {type: 'color', value: 'rgba(30,30,30,1.0)', name: 'Stroke color'},
        fill: {type: 'boolean', value: false, name: 'Fill'},
        fillColor: {type: 'color', value: 'rgba(240,240,240,1.0)', name: 'Fill color'},
        closed: {type: 'boolean', value: false, name: 'Closed path'},
        strokeSize: {type: 'number', value: 2, name: 'Stroke size'},
        strokePattern: {type: 'stroke-pattern', value: 'solid', name: 'Stroke pattern'},
        points: {type: 'curve-points', value: [], name: 'Curve points'}
    },

    mounted() {
        EventBus.subscribeForItemChanged(this.item.id, this.onItemChange);
    },
    beforeDestroy() {
        EventBus.unsubscribeForItemChanged(this.item.id, this.onItemChange);
    },

    data() {
        return {
            shapePath: computePath(this.item)
        }
    },

    methods: {
        onItemChange() {
            this.shapePath = computePath(this.item);
            this.$forceUpdate();
        }
    },

    computed: {
        strokeDashArray() {
            return StrokePattern.createDashArray(this.item.shapeProps.strokePattern, this.item.shapeProps.strokeSize);
        },

        fill() {
            if (this.item.shapeProps.fill) {
                return this.item.shapeProps.fillColor;
            }
            return 'none';
        }
    }
}
</script>