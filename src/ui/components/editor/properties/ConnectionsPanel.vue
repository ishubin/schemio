<template lang="html">
    <panel name="Connections" v-if="item.type === 'overlay' || item.type === 'component' || item.type === 'shape' || item.type === 'comment'">
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
