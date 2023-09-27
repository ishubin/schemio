<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div>
        <div>
            <div v-for="styleSection in defaultStyleSections">
                <ul class="shape-styles-preview">
                    <li v-for="stylePreview in styleSection.styles">
                        <div class="shape-style" @click="applyStyle(stylePreview.style)">
                            <svg width="40" height="30">
                                <advanced-fill :fill-id="stylePreview.style.id" :fill="stylePreview.style.fill" :area="{x: 4, y:4, w:32, h:22}"/>
                                <rect x="4" y="4" width="32" height="22" :fill="stylePreview.previewFill" :stroke="stylePreview.previewStroke" stroke-width="1"/>
                            </svg>
                        </div>
                    </li>
                </ul>
            </div>
        </div>
        <div>
            <ul class="shape-styles-preview">
                <li v-for="(stylePreview, stylePreviewIndex) in stylePreviews">
                    <div class="shape-style" @click="applyUserStyle(stylePreview.style)">
                        <svg width="40" height="30">
                            <advanced-fill :fill-id="stylePreview.style.id" :fill="stylePreview.style.fill" :area="{x: 4, y:4, w:32, h:22}"/>
                            <rect x="4" y="4" width="32" height="22" :fill="stylePreview.previewFill" :stroke="stylePreview.previewStroke" stroke-width="1"/>
                        </svg>
                    </div>
                </li>
            </ul>
        </div>
    </div>
</template>

<script>
import {map} from '../../../collections';
import AdvancedFill from '../items/AdvancedFill.vue';
import {defaultStyles} from './ItemStyles';

let cachedUserStyles = null;

export default {
    components: {AdvancedFill},

    beforeMount() {
        this.init();
    },

    data() {
        return {
            previewItems        : null,
            previewComponent    : null,
            stylePreviews       : [],
            defaultStyleSections: map(defaultStyles, styleSection => {
                return {
                    name: styleSection.name,
                    styles: map(styleSection.styles, this.convertStyleToPreview)
                };
            })
        }
    },

    methods: {
        init() {
            // optimizing it to not call api every time a new item is selected
            if (cachedUserStyles === null 
                && this.$store.state.apiClient && this.$store.state.apiClient.getStyles) {
                this.$store.state.apiClient.getStyles().then(styles => {
                    cachedUserStyles = styles;
                    this.stylePreviews = map(styles, this.convertStyleToPreview);
                });
            } else if (Array.isArray(cachedUserStyles)) {
                this.stylePreviews = map(cachedUserStyles, this.convertStyleToPreview);
            }
        },

        convertStyleToPreview(style) {
            return {
                style,
                previewFill: AdvancedFill.computeSvgFill(style.fill, style.id),
                previewStroke: style.strokeColor
            };
        },

        applyStyle(style) {
            this.$emit('style-applied', style);
        },

        applyUserStyle(style) {
            this.applyStyle(style);
        },
    },
}
</script>
