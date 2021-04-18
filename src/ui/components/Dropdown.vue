<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="dropdown-container">
        <div class="dropdown-click-area" :class="{'hover-effect': hoverEffect && !disabled}" @click="toggleDropdown">
            <slot v-if="value === null"></slot>
            <div v-else>
                <div v-if="selectedOption">
                    <i v-if="selectedOption.iconClass" :class="selectedOption.iconClass"/>
                    <span :style="selectedOption.style || {}"> {{selectedOption.name}} </span>
                </div>
                <span v-else>Unknown Value</span>
            </div>
        </div>

        <div ref="dropdownPopup" class="dropdown-popup" v-if="shown" :style="{'top': `${y}px`, 'left': `${x}px`, 'max-width': `${maxWidth}px`}">
            <input 
                ref="searchTextfield"
                class="dropdown-search"
                v-if="searchEnabled"
                placeholder="Search..."
                v-model="searchKeyword"
                @keydown.esc="cancelPopup()"
                @keydown.enter="pickFirstOption(filteredOptions)"
                data-input-type="dropdown-search"/>

            <div :style="{'max-width': `${maxWidth}px`,'max-height': `${maxHeight}px`, 'overflow': 'auto'}">
                <ul>
                    <li v-for="option in filteredOptions" @click="onOptionClicked(option)">
                        <i v-if="option.iconClass" :class="option.iconClass"/>
                        <div v-if="option.html" v-html="option.html"/>
                        <span v-else :style="option.style || {}"> {{option.name}} </span>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>

<script>
import filter from 'lodash/filter';
import find from 'lodash/find';

export default {
    /* options is an array of {name and any other fields} */
    props: {
        options        : {type: Array, required: true},
        value          : {type: String, default: null},
        hoverEffect    : {type: Boolean, default: true},
        searchEnabled  : {type: Boolean, default: true},
        disabled       : {type: Boolean, default: false},
        autoFocusSearch: {type: Boolean, default: true}
    },

    mounted() {
        document.body.addEventListener('click', this.onBodyClick);
        document.body.addEventListener('keydown', this.onGlobalKeydown);
    },

    beforeDestroy() {
        document.body.removeEventListener('click', this.onBodyClick);
        document.body.removeEventListener('keydown', this.onGlobalKeydown);
    },

    data() {
        let selectedOption = null;
        if (this.value) {
            selectedOption = find(this.options, option => option.name === this.value);
        }
        return {
            shown: false,
            lastTimeClicked: 0,
            searchKeyword: '',
            x: 0, y: 0,
            maxHeight: 300,
            searchTextfieldHeight: 30,
            maxWidth: 350,
            elementRect: null,
            selectedOption
        };
    },
    methods: {
        toggleDropdown(event) {
            if (this.disabled) {
                return;
            }

            const bbRect = event.target.getBoundingClientRect();
            this.elementRect = bbRect;

            this.lastTimeClicked = new Date().getTime();
            this.shown = !this.shown;
            if (this.shown) {
                this.$nextTick(() => {
                    this.readjustDropdownPopup();

                    if (this.$refs.searchTextfield && this.autoFocusSearch) {
                        this.$refs.searchTextfield.focus();
                    }
                });
            }
        },
        
        readjustDropdownPopup() {
            const popup = this.$refs.dropdownPopup;
            if (!popup || !this.elementRect) {
                return;
            }
            const width = popup.getBoundingClientRect().width;
            const height = popup.getBoundingClientRect().height;
            let originalX = Math.max(0, this.elementRect.x);
            let originalY = Math.max(0, this.elementRect.bottom);

            let rightSide = originalX + width;
            let bottomSide = originalY + height + this.searchTextfieldHeight;
            if (rightSide > window.innerWidth) {
                this.x = originalX + window.innerWidth - rightSide;
            } else {
                this.x = originalX;
            }

            if (bottomSide > window.innerHeight) {
                this.y = this.elementRect.top - height;
            } else {
                this.y = originalY;
            }
        },

        onOptionClicked(option) {
            this.$emit('selected', option);
        },

        onBodyClick(event) {
            if (this.shown === true && (new Date().getTime() - this.lastTimeClicked) > 200) {
                if (event.srcElement && event.srcElement.getAttribute('data-input-type') === 'dropdown-search') {
                    return;
                }
                this.shown = false;
                this.cancelPopup();
            }
        },
        onGlobalKeydown(event) {
            if (this.shown === true && (new Date().getTime() - this.lastTimeClicked) > 200) {
                if (event.srcElement && event.srcElement.getAttribute('data-input-type') === 'dropdown-search') {
                    return;
                }
                this.cancelPopup();
            }
        },

        cancelPopup() {
            this.shown = false;
        },

        pickFirstOption(options) {
            if (options.length > 0) {
                this.onOptionClicked(options[0]);
            }
            this.cancelPopup();
        }
    },
    computed: {
        filteredOptions() {
            return filter(this.options, option => option.name.toLowerCase().indexOf(this.searchKeyword.toLowerCase()) >= 0);
        }
    },
    watch: {
        value(newValue) {
            this.selectedOption = find(this.options, option => option.name === newValue);
        }
    }
}
</script>

<style lang="css">
</style>
