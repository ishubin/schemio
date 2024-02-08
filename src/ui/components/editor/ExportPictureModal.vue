<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <modal :title="title" @close="$emit('close')" primary-button="Save" @primary-submit="saveIt"  :width="800">
        <div class="progress-bar-container">
            <div v-if="isLoading" class="progress-bar progress-bar-hovering"></div>
        </div>
        <div v-if="errorMessage" class="msg msg-danger">
            {{ errorMessage }}
        </div>
        <div class="row">
            <div class="col-1">
                <div v-if="simplePadding" class="row padded centered gap">
                    <i @click="simplePadding=false" class="fa-solid fa-border-none" style="cursor:pointer" title="Advanced padding"></i>
                    <number-textfield :value="padding" name="Padding" @changed="padding = arguments[0]" style="max-width: 150px;"/>
                </div>
                <div v-else class="row centered gap">
                    <i @click="simplePadding=true" class="fa-solid fa-border-all" style="cursor:pointer" title="Simple padding"></i>
                    <div class="col-1">
                        <div class="row padded centered gap">
                            <number-textfield :value="paddingLeft" name="Left" @changed="paddingLeft = arguments[0]"/>
                            <number-textfield :value="paddingTop" name="Top" @changed="paddingTop = arguments[0]"/>
                        </div>
                        <div class="row padded centered gap">
                            <number-textfield :value="paddingRight" name="Right" @changed="paddingRight = arguments[0]"/>
                            <number-textfield :value="paddingBottom" name="Bottom" @changed="paddingBottom = arguments[0]"/>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-1">
                <div class="row padded centered gap">
                    <number-textfield :value="rasterWidth" name="Width" @changed="rasterWidth = arguments[0]"/>
                    <number-textfield :value="rasterHeight" name="Height" @changed="rasterHeight = arguments[0]"/>
                </div>
                <div class="row padded centered gap">
                    <div class="col-1">
                        <div v-if="kind === 'svg'" class="row centered gap">
                            <span>Placement</span>
                            <select v-model="placement">
                                <option value="top-left">Top Left</option>
                                <option value="centered">Centered</option>
                                <option value="stretched">Stretched</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-1">
                        <div class="row padded centered gap">
                            <input type="checkbox" v-model="shouldExportBackground" id="chk-export-svg-background"/><label for="chk-export-svg-background">Background</label>
                        </div>
                    </div>
                    <div class="col-1">
                        <div class="row padded centered gap">
                            <input type="checkbox" v-model="shouldExportDataURL" id="chk-export-data-url"/><label for="chk-export-data-url">DataURL</label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div>
        </div>

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

        <modal v-if="dataURLModal.shown" title="Image Data URL" @close="dataURLModal.shown = false">
            <p>Your image data URL is ready! Copy it from this textarea</p>
            <textarea ref="dataURLTextarea" class="textfield" v-model="dataURLModal.text"></textarea>
        </modal>
    </modal>
</template>

<script>
import Modal from '../Modal.vue';
import NumberTextfield from '../NumberTextfield.vue';
import {forEach} from '../../collections';
import {diagramImageExporter} from '../../diagramExporter';



export default {
    props: {
        items : { value: [], type: Array },

        // kind can be either svg or png
        kind           : { value: 'svg', type: String},
        backgroundColor: { value: 'rgba(255,255,255,1.0)', type: String}
    },

    components: {Modal, NumberTextfield},

    data() {
        const exporter = diagramImageExporter(this.items);
        let largestStrokeSize = 0;
        forEach(this.items, item => {
            if (!isNaN(item.shapeProps.strokeSize) && item.shapeProps.strokeSize > largestStrokeSize) {
                largestStrokeSize = item.shapeProps.strokeSize;
            }
        });

        const defaultPadding = Math.max(2, 2 * largestStrokeSize);
        let paddingTop = defaultPadding;
        let paddingLeft = defaultPadding;
        let paddingRight = defaultPadding;
        let paddingBottom = defaultPadding;

        if (exporter.width < 60 || exporter.height < 60) {
            paddingTop = 2 * largestStrokeSize;
            paddingLeft = 2 * largestStrokeSize;
            paddingRight = 2 * largestStrokeSize;
            paddingBottom = 2 * largestStrokeSize;
        }

        return {
            exporter,
            shouldExportBackground: false,
            shouldExportDataURL: false,

            simplePadding: true,
            padding: paddingTop,
            paddingTop,
            paddingLeft,
            paddingBottom,
            paddingRight,
            largestStrokeSize,
            placement: 'centered', // can be top-left, centered, stretched
            svgHtml: exporter.previewSvgHtml,
            previewPadding: 20,

            width: exporter.width,
            height: exporter.height,
            rasterWidth: exporter.width,
            rasterHeight: exporter.height,

            isLoading: false,
            errorMessage: null,
            dataURLModal: {
                shown: false,
                text: ''
            }
        };
    },

    methods: {
        saveIt() {
            this.isLoading = true;
            this.errorMessage = null;
            this.exporter.exportImage({
                width: this.width,
                height: this.height,
                paddingLeft: this.paddingLeft,
                paddingRight: this.paddingRight,
                paddingTop: this.paddingTop,
                paddingBottom: this.paddingBottom,
                backgroundColor: this.shouldExportBackground ? this.backgroundColor : null,
                format: this.kind,
            }).then(imageDataUrl => {
                this.isLoading = false;
                if (this.shouldExportDataURL) {
                    this.dataURLModal.text = imageDataUrl;
                    this.dataURLModal.shown = true;
                    this.$nextTick(() => {
                        this.$refs.dataURLTextarea.focus();
                    });
                } else {
                    this.downloadViaLink(`${this.items[0].name}.${this.kind}`, imageDataUrl);
                }
            })
            .catch(err => {
                console.error('Failed to generate image', err);
                this.isLoading = false;
                this.errorMessage = 'Something went wrong, was not able to generate image';
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

    watch: {
        padding(value) {
            this.paddingLeft = value;
            this.paddingRight = value;
            this.paddingTop = value;
            this.paddingBottom = value;
        },
        simplePadding(value) {
            if (value) {
                this.paddingLeft = this.padding;
                this.paddingRight = this.padding;
                this.paddingTop = this.padding;
                this.paddingBottom = this.padding;
            }
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