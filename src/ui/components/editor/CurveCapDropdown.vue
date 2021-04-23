<template>
    <dropdown :options="capOptions"
        @selected="$emit('selected', arguments[0].name)">
        <div v-html="selectedCapHtml"></div>
    </dropdown>
</template>

<script>
import Dropdown from '../Dropdown.vue';
import map from 'lodash/map';
import { createConnectorCap, getCapTypes, getCapDefaultFill } from './items/shapes/ConnectorCaps';

function generateCapHtml(w, h, y, cap) {
    let html = `<svg width="${w}px" height="${h}px"><g transform="translate(5, 0)">`;

    html += `<path d="M0 ${y} l 30 0" fill="none" stroke="#111111" stroke-width="2"/>`;

    if (cap) {
        let fill = 'none';
        if (cap.fill) {
            fill = cap.fill;
        }
        html += `<path d="${cap.path}" fill="${fill}" stroke="#111111" stroke-width="2"/>`;
    }
    html += '</g></svg>';
    return html;
}

const rightCaps = map(getCapTypes(), capType => {
    let fill = getCapDefaultFill(capType);
    if (!fill) {
        fill = '#111111';
    }
    return {
        name: capType,
        cap: createConnectorCap(30, 15, -15, 0, capType, fill)
    };
});
const leftCaps = map(getCapTypes(), capType => {
    let fill = getCapDefaultFill(capType);
    if (!fill) {
        fill = '#111111';
    }
    return {
        name: capType,
        cap: createConnectorCap(0, 15, 15, 0, capType, fill)
    }
});

export default {
    props: {
        value: { type: String },
        isSource: { type: Boolean, default: false },
        width : {type: String, default: '30px'},
        height: {type: String, default: '20px'},
    },
    components: {Dropdown},

    data() {
        let caps = rightCaps;
        if (this.isSource) {
            caps = leftCaps;
        }
        const capOptions = map(caps, cap => {
            return {
                name: cap.name,
                html: generateCapHtml(100, 30, 15, cap.cap)
            };
        });
        return {
            capOptions,

            selectedCapHtml: this.generateSelectedCapHtml(this.value)
        };
    },

    methods: {
        generateSelectedCapHtml(capType) {
            let cap = null;
            let fill = getCapDefaultFill(capType);
            if (!fill) {
                fill = '#111111';
            }
            if (this.isSource) {
                cap = createConnectorCap(0, 7, 12, 0, capType, fill);
            } else {
                cap = createConnectorCap(30, 7, -12, 0, capType, fill);
            }
            return generateCapHtml(40, 20, 7, cap);
        }
    },

    watch: {
        value(value) {
            this.selectedCapHtml = this.generateSelectedCapHtml(value);
        }
    }
}
</script>