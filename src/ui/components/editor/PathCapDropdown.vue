<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <dropdown :options="capOptions"
        @selected="$emit('selected', arguments[0].name)">
        <div v-html="selectedCapHtml"></div>
    </dropdown>
</template>

<script>
import Dropdown from '../Dropdown.vue';
import {map, filter} from '../../collections';
import { createConnectorCap, getCapTypes } from './items/shapes/ConnectorCaps';

function generateCapHtml(w, h, y, cap, isSource) {
    let html = `<svg width="${w}px" height="${h}px"><g transform="translate(5, 0)">`;

    let x1 = 0;
    let x2 = 30;

    if (cap) {
        if (!cap.prolongLine) {
            if (isSource) {
                x1 = cap.entryPoint.x;
            } else {
                x2 = cap.entryPoint.x;
            }
        }
        let fill = '#111111';
        if (cap.hollow) {
            fill = 'none';
        }
        html += `<path d="${cap.path}" fill="${fill}" stroke="#111111" stroke-width="2"/>`;
    }
    html += `<path d="M ${x1} ${y} L ${x2} ${y}" fill="none" stroke="#111111" stroke-width="2"/>`;
    html += '</g></svg>';
    return html;
}

const rightCaps = map(getCapTypes(), capType => {
    return {
        name: capType,
        cap: createConnectorCap(30, 15, -15, 0, capType)
    };
});
const leftCaps = map(getCapTypes(), capType => {
    return {
        name: capType,
        cap: createConnectorCap(0, 15, 15, 0, capType)
    }
});

function generateCapOptions(caps, isSource) {
    return map(caps, cap => {
        return {
            name: cap.name,
            html: generateCapHtml(100, 30, 15, cap.cap, isSource)
        };
    });

}

export default {
    props: {
        value: { type: String },
        isSource: { type: Boolean, default: false },
        width : {type: String, default: '30px'},
        height: {type: Number, default: 20},
        isFat: {type: Boolean, default: false},
    },
    components: {Dropdown},

    data() {
        let caps = rightCaps;
        if (this.isSource) {
            caps = leftCaps;
        }
        let capOptions = [];
        if (this.isFat) {
            capOptions = generateCapOptions(filter(caps, cap => cap.name === 'empty' || cap.name === 'triangle'), this.isSource);
        } else {
            capOptions = generateCapOptions(caps, this.isSource);
        }
        return {
            capOptions,

            selectedCapHtml: this.generateSelectedCapHtml(this.value)
        };
    },

    methods: {
        generateSelectedCapHtml(capType) {
            let cap = null;
            if (this.isSource) {
                cap = createConnectorCap(0, 7, 12, 0, capType);
            } else {
                cap = createConnectorCap(30, 7, -12, 0, capType);
            }
            return generateCapHtml(40, this.height, 7, cap, this.isSource);
        }
    },

    watch: {
        value(value) {
            this.selectedCapHtml = this.generateSelectedCapHtml(value);
        }
    }
}
</script>