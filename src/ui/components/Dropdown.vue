<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div ref="container" class="dropdown-container" :class="{inline: inline, borderless: borderless}">
        <div class="dropdown-click-area" :style="dropwonClickAreaStyle" :class="{'hover-effect': hoverEffect && !disabled}" @click="toggleDropdown">
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
                @keydown.enter="onEnterDown()"
                @keydown.down="onKeyArrowDown()"
                @keydown.up="onKeyArrowUp()"
                data-input-type="dropdown-search"/>

            <div :style="{'max-width': `${maxWidth}px`,'max-height': `${maxHeight}px`, 'overflow': 'auto'}">
                <ul class="__options">
                    <li v-for="(option, optionIdx) in filteredOptions"
                        :class="{hovered: optionIdx === hoveredOption.idx}"
                        @click="onOptionClicked(option)" @mouseover="onOptionMouseOver(option, optionIdx)" @mouseleave="onOptionMouseLeave()"
                        >
                        <i v-if="option.iconClass" :class="option.iconClass"/>
                        <div v-if="option.html" v-html="option.html"/>
                        <span v-else :style="option.style || {}"> {{option.name}} </span>
                    </li>
                </ul>
            </div>
        </div>

        <div v-if="shown && hoveredOption.shown"
            class="dropdown-option-tooltip"
            :style="{'top': `${hoveredOption.y}px`, 'left': `${hoveredOption.x}px`, 'width': `${hoveredOption.w}px`, 'height': `${hoveredOption.h}px`}"
            >
            <h3>
                <i v-if="hoveredOption.iconClass" :class="hoveredOption.iconClass"/>
                {{hoveredOption.title}}
            </h3>
            {{hoveredOption.text}}
        </div>
    </div>
</template>

<script>
import {filter, find} from '../collections';


export default {
    props: {
        /* options is an array of {name and any other fields} */
        options        : {type: Array, required: true},
        value          : {type: String, default: null},
        hoverEffect    : {type: Boolean, default: true},
        searchEnabled  : {type: Boolean, default: true},
        disabled       : {type: Boolean, default: false},
        autoFocusSearch: {type: Boolean, default: true},
        inline         : {type: Boolean, default: false},
        width          : {type: Number, default: 0}, //only used in combination with inline
        borderless     : {type: Boolean, default: false},
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
            maxWidth: 400,
            elementRect: null,
            selectedOption,
            isAbove: false,
            filteredOptions: [],
            hoveredOption: {
                shown: false,
                title: '',
                text: '',
                x: 0, y: 0,
                w: 200, h: 200,
                idx: -1
            },
        };
    },
    methods: {
        updateFilteredOptions() {
            this.hoveredOption.idx = -1;
            this.filteredOptions = this.filterOptions();
        },

        filterOptions() {
            return filter(this.options, option => option.name.toLowerCase().indexOf(this.searchKeyword.toLowerCase()) >= 0);
        },

        onKeyArrowDown() {
            this.hoveredOption.idx = Math.min(this.hoveredOption.idx + 1, this.filteredOptions.length);
            this.toggleHoverOptionByKeyboard();
        },

        onKeyArrowUp() {
            this.hoveredOption.idx = Math.max(0, this.hoveredOption.idx - 1);
            this.toggleHoverOptionByKeyboard();
        },

        toggleHoverOptionByKeyboard() {
            if (this.hoveredOption.idx >= 0 && this.hoveredOption.idx < this.filteredOptions.length) {
                this.toggleHoverOption(this.filteredOptions[this.hoveredOption.idx]);
                const liElements = this.$refs.container.querySelectorAll('ul.__options li');
                if (liElements && this.hoveredOption.idx >= 0 && this.hoveredOption.idx < liElements.length) {
                    liElements[this.hoveredOption.idx].scrollIntoView();
                }
            }
        },

        toggleDropdown(event) {
            this.updateFilteredOptions();
            this.searchKeyword = '';
            if (this.disabled) {
                return;
            }

            const bbRect = this.$refs.container.getBoundingClientRect();
            this.elementRect = bbRect;

            this.lastTimeClicked = new Date().getTime();
            this.shown = !this.shown;
            if (this.shown) {
                this.emitToggled();
                this.$nextTick(() => {
                    this.readjustDropdownPopup();

                    if (this.$refs.searchTextfield && this.autoFocusSearch) {
                        this.$refs.searchTextfield.focus();
                    }
                });
            } else {
                this.emitHidden();
            }
        },

        emitToggled() {
            this.$emit('dropdown-toggled');
        },

        emitHidden() {
            this.$emit('dropdown-hidden');
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
                if (window.innerHeight - originalY - this.searchTextfieldHeight > originalY) {
                    this.y = originalY;
                    this.maxHeight = window.innerHeight - originalY - this.searchTextfieldHeight;
                    this.isAbove = false;
                } else {
                    this.y = Math.max(5, originalY - height - this.elementRect.height);
                    this.maxHeight = Math.max(100, Math.min(300, originalY - this.y - this.searchTextfieldHeight - 5));
                    this.isAbove = true;
                }
            } else {
                this.y = originalY;
                this.isAbove = false;
            }
        },

        updateYPosition() {
            if (!this.isAbove) {
                return;
            }
            const height = this.$refs.dropdownPopup.getBoundingClientRect().height;
            const containerY = this.$refs.container.getBoundingClientRect().y;
            this.y = Math.max(5, containerY - height);
        },

        onOptionClicked(option) {
            this.$emit('selected', option);
        },

        onBodyClick(event) {
            if (this.shown === true && (new Date().getTime() - this.lastTimeClicked) > 200) {
                if (event.srcElement && event.srcElement.getAttribute('data-input-type') === 'dropdown-search') {
                    return;
                }
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
            if (this.shown) {
                this.emitHidden();
            }
            this.shown = false;
        },

        onEnterDown() {
            if (this.hoveredOption.idx >= 0 && this.hoveredOption.idx < this.filteredOptions.length) {
                this.onOptionClicked(this.filteredOptions[this.hoveredOption.idx]);
            } else if (this.filteredOptions.length > 0) {
                this.onOptionClicked(this.filteredOptions[0]);
            }
            this.cancelPopup();
        },

        onOptionMouseOver(option, optionIdx) {
            this.hoveredOption.idx = optionIdx;
            this.toggleHoverOption(option);
        },

        toggleHoverOption(option) {
            if (option.description) {
                if (this.hoveredOption.title !== option.name || !this.hoveredOption.shown) {
                    this.hoveredOption.shown = true;
                    this.hoveredOption.title = option.name;
                    this.hoveredOption.iconClass = option.iconClass;
                    this.hoveredOption.text = option.description;

                    const dropdownElement = this.$refs.dropdownPopup;
                    if (dropdownElement) {
                        const rect = dropdownElement.getBoundingClientRect();

                        let x = rect.left - this.hoveredOption.w;
                        let y = rect.top;

                        if (x < 0) {
                            x = rect.right;
                        }

                        let overlap = y + this.hoveredOption.h - window.innerHeight;
                        if (overlap > 0) {
                            y = y - overlap;
                        }

                        this.hoveredOption.x = x;
                        this.hoveredOption.y = y;
                    }
                }
            } else {
                this.hoveredOption.shown = false;
            }
        },

        onOptionMouseLeave() {
            this.hoveredOption.shown = false;
        }
    },
    computed: {
        dropwonClickAreaStyle() {
            const style = {};
            if (this.inline && this.width > 0) {
                style['min-width'] = `${this.width}px`;
            }
            return style;
        }
    },
    watch: {
        value(newValue) {
            this.selectedOption = find(this.options, option => option.name === newValue);
        },

        searchKeyword() {
            this.updateFilteredOptions();
            this.$nextTick(() => {
                this.updateYPosition();
            });
        }
    }
}
</script>

<style lang="css">
</style>
