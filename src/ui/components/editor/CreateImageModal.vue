<template lang="html">
    <modal title="Create Image" @close="$emit('close')" primary-button="Create" @primary-submit="submitCreateImage()">
        <h5>Image URL</h5>
        <input type="text" class="textfield" v-model="url"/>
    </modal>

</template>

<script>
import Modal from '../Modal.vue';
export default {
    props: [],
    components: {Modal},

    data() {
        return {
            url: ''
        }
    },
    methods: {
        submitCreateImage() {
            this.$emit('submit-image', this.url);
        }
    }
}
</script>

<style lang="css">
</style>
