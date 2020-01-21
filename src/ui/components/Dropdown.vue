<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="dropdown-container">
        <div class="dropdown-click-area" @click="toggleDropdown">
            <slot></slot>
        </div>

        <div class="dropdown-popup" v-if="shown" :style="{'top': `${y}px`, 'left': `${x}px`, 'max-width': `${maxWidth}px`}">
            <input class="dropdown-search" placeholder="Search..." v-model="searchKeyword" data-input-type="dropdown-search" autofocus/>
            <div :style="{'max-width': `${maxWidth}px`,'max-height': `${maxHeight}px`, 'overflow': 'auto'}">
                <ul>
                    <li v-for="option in filteredOptions" @click="onOptionClicked(option)">
                        <i v-if="option.iconClass" :class="option.iconClass"/>
                        <span :style="option.style || {}"> {{option.name}} </span>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>

<script>
import _ from 'lodash';

export default {
    /* options is an array of {name and any other fields} */
    props: ['options'],
    mounted() {
        document.body.addEventListener('click', this.onBodyClick);
    },
    beforeDestroy() {
        document.body.removeEventListener('click', this.onBodyClick);
    },
    data() {
        return {
            shown: false,
            lastTimeClicked: 0,
            searchKeyword: '',
            x: 0, y: 0,
            maxHeight: 300,
            searchTextfieldHeight: 30,
            maxWidth: 150
        };
    },
    methods: {
        toggleDropdown(event) {
            //console.log(event.target.getBoundingClientRect());
            const bbRect = event.target.getBoundingClientRect();
            let originalX = Math.max(0, bbRect.x);
            let originalY = Math.max(0, bbRect.bottom);

            let rightSide = originalX + this.maxWidth;
            let bottomSide = originalY + this.maxHeight + this.searchTextfieldHeight;
            let dx = 0, dy = 0;
            if (rightSide > window.innerWidth) {
                dx = window.innerWidth - rightSide;
            }
            if (bottomSide > window.innerHeight) {
                dy = window.innerHeight - bottomSide;
            }

            this.x = originalX + dx;
            this.y = originalY + dy;


            this.lastTimeClicked = new Date().getTime();
            this.shown = !this.shown;
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
            }
        }
    },
    computed: {
        filteredOptions() {
            return _.filter(this.options, option => option.name.toLowerCase().indexOf(this.searchKeyword.toLowerCase()) >= 0);
        }
    }
}
</script>

<style lang="css">
</style>
