<template>
    <modal title="Export template" @close="$emit('close')" :width="600">
        <div class="template-export-container">
            <div>
                <div class="ctrl-label">Name</div>
                <input class="textfield" v-model="name"/>

                <div class="ctrl-label">Preview</div>
                <div class="preview">
                    <img :src="imagePreview"/>
                </div>
            </div>
            <div class="template-export-code">
                <div class="ctrl-label">Content</div>
                <p class="hint hint-small">Template exporting is only used by the developers of Schemio</p>
                <textarea class="textfield" v-model="content"></textarea>
            </div>
        </div>
    </modal>
</template>

<script>
import Modal from '../Modal.vue';
import map from 'lodash/map';
import forEach from 'lodash/forEach';
import {prepareDiagramForPictureExport} from '../../diagramExporter'
import utils from '../../utils';
import { traverseItems } from '../../scheme/Item';

function generateTemplate(rootItem, svgPreview, padding, width, height) {
    rootItem = utils.clone(rootItem);

    traverseItems([rootItem], item => {
        if (item.meta) {
            delete item.meta;
        }
    });
    const svgImage = `<svg ref="svgContainer" class="export-svg-preview"
        width="100%" height="200px"
        viewBox="${-padding} ${-padding} ${width + 2*padding} ${height + 2*padding}"
        preserveAspectRatio="xMidYMid"
        xmlns="http://www.w3.org/2000/svg"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:xlink="http://www.w3.org/1999/xlink" >
        ${svgPreview}
    </svg>`

    return {
        name: rootItem.name,
        args: {},
        preview: 'data:image/svg+xml;base64,' + btoa(svgImage),
        item: rootItem,
    };
}

export default {
    components: {Modal},

    props: {
        item: {type: Object, required: true},
    },

    data() {
        const preparedItems = prepareDiagramForPictureExport([this.item]);
        const svgHtml = map(preparedItems.exportedItems, e => e.html).join('\n');

        let largestStrokeSize = 0;
        forEach(preparedItems.exportedItems, item => {
            if (!isNaN(item.item.shapeProps.strokeSize) && item.item.shapeProps.strokeSize > largestStrokeSize) {
                largestStrokeSize = item.item.shapeProps.strokeSize;
            }
        });

        const padding = Math.max(10, 2 * largestStrokeSize);

        const template = generateTemplate(this.item, svgHtml, padding, preparedItems.width, preparedItems.height);
        return {
            preparedItems,
            name: template.name,
            svgHtml,
            padding,
            width: preparedItems.width,
            height: preparedItems.height,
            imagePreview: template.preview,
            content: JSON.stringify(template),
            refreshTimeoutId: null
        };
    },

    methods: {
        generateCode() {
            const template = generateTemplate(this.item, this.svgHtml, this.padding, this.width, this.height);
            template.name = this.name;
            this.content = JSON.stringify(template);
        }
    },

    watch: {
        name(value) {
            if (this.refreshTimeoutId) {
                clearTimeout(this.refreshTimeoutId);
            }
            this.refreshTimeoutId = setTimeout(() => {
                this.generateCode();
                this.refreshTimeoutId = null;
            }, 300);
        }
    }
};
</script>