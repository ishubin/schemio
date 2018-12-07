<template lang="html">
    <modal :title="popupTitle" :primary-button="submitTitle" @primary-submit="submitLink()" @close="$emit('close')">
       <h5>Title</h5>
       <input type="text" class="textfield" v-model:value="editTitle"/>

       <h5>URL</h5>
       <input type="text" class="textfield" v-model:value="editUrl"/>
    </modal>
</template>

<script>
import Modal from '../Modal.vue';
export default {
    props: ['edit', 'title', 'url'],
    components : {Modal},

    data() {
        return {
            popupTitle: this.edit ? 'Edit Link' : 'Create Link',
            submitTitle: this.edit ? 'Update' : 'Create',
            editTitle: this.title,
            editUrl: this.url
        }
    },
    methods: {
        submitLink() {
            this.$emit('submit-link', {
                title: this.editTitle,
                url: this.editUrl
            });
            this.$emit('close');
        }
    }
}
</script>

<style lang="css">
</style>
