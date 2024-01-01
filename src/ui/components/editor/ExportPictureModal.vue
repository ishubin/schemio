<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <modal :title="title" @close="$emit('close')" primary-button="Save" @primary-submit="saveIt">
        <table>
            <tbody>
                <tr>
                    <td>
                        <number-textfield :value="paddingLeft" name="Left" @changed="paddingLeft = arguments[0]"/>
                    </td>
                    <td>
                        <number-textfield :value="paddingTop" name="Top" @changed="paddingTop = arguments[0]"/>
                    </td>
                    <td>
                        <number-textfield :value="paddingRight" name="Right" @changed="paddingRight = arguments[0]"/>
                    </td>
                    <td>
                        <number-textfield :value="paddingBottom" name="Bottom" @changed="paddingBottom = arguments[0]"/>
                    </td>
                </tr>
                <tr>
                    <td colspan="2">
                        Placement
                        <select v-model="placement">
                            <option value="top-left">Top Left</option>
                            <option value="centered">Centered</option>
                            <option value="stretched">Stretched</option>
                        </select>
                    </td>
                    <td colspan="2">
                        <input type="checkbox" v-model="shouldExportBackground" id="chk-export-svg-background"/><label for="chk-export-svg-background"> Export SVG Background</label>
                    </td>
                </tr>
                <tr v-if="kind === 'png'">
                    <td>
                        <number-textfield :value="rasterWidth" name="Width" @changed="rasterWidth = arguments[0]"/>
                    </td>
                    <td>
                        <number-textfield :value="rasterHeight" name="Height" @changed="rasterHeight = arguments[0]"/>
                    </td>
                    <td colspan="2">
                    </td>
                </tr>
            </tbody>
        </table>

        <svg ref="svgContainer" class="export-svg-preview"
            width="100%" height="300px"
            :viewBox="`${-paddingLeft - previewPadding} ${-paddingTop - previewPadding} ${viewBoxWidth + 4*previewPadding} ${viewBoxHeight + 4*previewPadding}`"
            :preserveAspectRatio="preserveAspectRatio"
            :style="svgStyle"
            xmlns="http://www.w3.org/2000/svg"
            xmlns:xhtml="http://www.w3.org/1999/xhtml"
            xmlns:xlink="http://www.w3.org/1999/xlink" >
            <g data-preview-ignore="true">
                <rect :x="-paddingLeft" :y="-paddingTop" :width="viewBoxWidth+paddingLeft" :height="viewBoxHeight+paddingTop"
                    style="fill:none; stroke-width:1; stroke:rgba(100,100,255, 0.2)"
                    :style="{'stroke-width': previewStrokeSize}"/>
            </g>
            <g v-html="svgHtml"></g>
        </svg>
    </modal>
</template>

<script>
import Modal from '../Modal.vue';
import NumberTextfield from '../NumberTextfield.vue';
import {forEach, map} from '../../collections';
import {rasterizeAllImagesToDataURL} from '../../svgPreview';
import {svgToImage} from '../../diagramExporter';
import { encode } from 'js-base64';



export default {
    props: {
        // array of {item, html} elements
        exportedItems  : { value: [], type: Array },
        width          : { value: 300, type: Number },
        height         : { value: 300, type: Number },

        // kind can be either svg or png
        kind           : { value: 'svg', type: String},
        backgroundColor: { value: 'rgba(255,255,255,1.0)', type: String}
    },

    components: {Modal, NumberTextfield},

    data() {
        const svgHtml = map(this.exportedItems, e => e.html).join('\n');

        let largestStrokeSize = 0;
        forEach(this.exportedItems, item => {
            if (!isNaN(item.item.shapeProps.strokeSize) && item.item.shapeProps.strokeSize > largestStrokeSize) {
                largestStrokeSize = item.item.shapeProps.strokeSize;
            }
        });

        const defaultPadding = Math.max(40, 2 * largestStrokeSize);
        let paddingTop = defaultPadding;
        let paddingLeft = defaultPadding;
        let paddingRight = defaultPadding;
        let paddingBottom = defaultPadding;

        if (this.width < 60 || this.height < 60) {
            paddingTop = 2 * largestStrokeSize;
            paddingLeft = 2 * largestStrokeSize;
            paddingRight = 2 * largestStrokeSize;
            paddingBottom = 2 * largestStrokeSize;
        }

        return {
            shouldExportBackground: false,
            paddingTop,
            paddingLeft,
            paddingBottom,
            paddingRight,
            largestStrokeSize,
            placement: 'centered', // can be top-left, centered, stretched
            svgHtml: svgHtml,
            previewPadding: 20,

            rasterWidth: this.width,
            rasterHeight: this.height
        };
    },

    methods: {
        saveIt() {
            const svgDom = this.$refs.svgContainer.cloneNode(true);
            forEach(svgDom.childNodes, child => {
                if (child && child.nodeType === Node.ELEMENT_NODE) {
                    if (child.getAttribute('data-preview-ignore') === 'true') {
                        svgDom.removeChild(child);
                    }
                }
            });

            rasterizeAllImagesToDataURL(svgDom)
            .catch(err => {
                console.error('Failed to rasterize some images', err);
            })
            .then(() => {
                const viewBoxWidth = this.width + this.paddingRight + this.paddingLeft;
                const viewBoxHeight = this.height + this.paddingBottom + this.paddingTop;
                svgDom.setAttribute('viewBox', `${-this.paddingLeft} ${-this.paddingTop} ${viewBoxWidth} ${viewBoxHeight}`);
                if (this.kind === 'svg') {
                    svgDom.removeAttribute('width');
                    svgDom.removeAttribute('height');
                } else {
                    svgDom.setAttribute('width', `${this.rasterWidth}px`);
                    svgDom.setAttribute('height', `${this.rasterHeight}px`);
                }

                const svgCode = new XMLSerializer().serializeToString(svgDom);

                if (this.kind === 'svg') {
                    const svgDataUrl = `data:image/svg+xml;base64,${encode(svgCode)}`;
                    this.downloadViaLink( `${this.exportedItems[0].item.name}.svg`, svgDataUrl);
                } else {
                    const backgroundColor = this.shouldExportBackground ? this.backgroundColor : null;
                    svgToImage(svgCode, this.rasterWidth, this.rasterHeight, this.paddingLeft, this.paddingTop, backgroundColor)
                    .then(imageDataUrl => {
                        this.downloadViaLink(`${this.exportedItems[0].item.name}.png`, imageDataUrl);
                    })
                    .catch(err => {
                        console.error(err);
                        alert('Something went wrong, failed to generate image');
                    });
                }
            });
        },

        downloadViaLink(name, content) {
            const link = document.createElement('a');
            document.body.appendChild(link);
            try {
                link.href = content;
                link.download = name;
                link.click();
                this.$emit('close');
            } catch(e) {
                console.error(e);
            }
            setTimeout(() => document.body.removeChild(link), 100);
        }
    },

    computed: {
        preserveAspectRatio() {
            if (this.placement === 'stretched') {
                return 'none';
            } else if (this.placement === 'centered') {
                return 'xMidYMid';
            }
            return 'xMinYMin';
        },

        svgStyle() {
            if (this.shouldExportBackground) {
                return {
                    background: this.backgroundColor
                };
            }
            return {};
        },

        previewStrokeSize() {
            const vw = this.width + 2 * this.previewPadding + this.paddingLeft + this.paddingRight;
            const vh = this.height + 2 * this.previewPadding + this.paddingTop + this.paddingBottom;

            if (Math.abs(vw) < 0.001 || Math.abs(vh) < 0.001) {
                return 1;
            }

            return 2 * Math.max(Math.abs(vw/600), Math.abs(vh/380));
        },

        viewBoxWidth() {
            return this.width + this.paddingRight;
        },

        viewBoxHeight() {
            return this.height + this.paddingBottom;
        },

        title() {
            if (this.kind === 'svg') {
                return 'Export as SVG';
            } else {
                return 'Export as PNG';
            }
        }
    }
}
</script>