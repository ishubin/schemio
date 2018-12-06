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
