<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <panel name="Connections">
        <span class="btn btn-secondary" v-on:click="connectItem()"><i class="fas fa-sitemap"></i> Connect</span>
    </panel>
</template>

<script>
import EventBus from '../EventBus.js';
import Panel from '../Panel.vue';

export default {
    props: ['item'],
    components: {Panel},
    methods: {
        connectItem() {
            EventBus.$emit(EventBus.START_CONNECTING_ITEM, this.item);
        }
    }
}
</script>

<style lang="css">
</style>
