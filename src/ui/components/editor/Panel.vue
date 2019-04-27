<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="panel">
        <div class="panel-title"
            :class="{'panel-expanded': isOpen, 'panel-collapsed': !isOpen}"
            @click="togglePanel">{{name}}</div>
        <div class="panel-body" v-if="isOpen">
            <slot></slot>
        </div>
    </div>
</template>

<script>
export default {
    props: {
        open: {
            type: Boolean,
            default: true
        },
        name: String
    },
    data() {
        return {
            isOpen: this.open
        }
    },
    methods: {
        togglePanel() {
            this.isOpen = !this.isOpen;
            this.$emit('value', this.isOpen);
        }
    }
}
</script>

<style lang="css">
</style>
