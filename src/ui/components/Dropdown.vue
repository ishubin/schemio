<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="dropdown-container">
        <div class="dropdown-click-area" @click="toggleDropdown">
            <slot></slot>
        </div>

        <div class="dropdown-popup" v-if="shown">
            <ul>
                <li v-for="option in options" @click="onOptionClicked(option)">
                    {{option.name}}
                    <i class="dropdown-option-icon" v-if="option.icon" :class="option.icon"></i>
                </li>
            </ul>
        </div>
    </div>
</template>

<script>
export default {
    props: ["options"],
    mounted() {
        document.body.addEventListener('click', this.onBodyClick);
    },
    beforeDestroy() {
        document.body.removeEventListener('click', this.onBodyClick);
    },
    data() {
        return {
            shown: false,
            lastTimeClicked: 0
        };
    },
    methods: {
        toggleDropdown() {
            this.lastTimeClicked = new Date().getTime();
            this.shown = !this.shown;
        },

        onOptionClicked(option) {
            if (option.link) {
                window.location.href = option.link;
            } else if (option.emit) {
                this.$emit(option.emit);
            }
        },

        onBodyClick(event) {
            if (this.shown === true && (new Date().getTime() - this.lastTimeClicked) > 200) {
                this.shown = false;
            }
        }
    }
}
</script>

<style lang="css">
</style>
