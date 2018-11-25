<template lang="html">
    <transition name="modal">
       <div class="modal-mask">
           <div class="modal-wrapper">
               <div class="modal-container">
                   <div class="modal-header">
                       <h3>{{popupTitle}}</h3>
                   </div>
                   <div class="modal-body">
                       <h5>Title</h5>
                       <input type="text" v-model:value="editTitle"/>

                       <h5>URL</h5>
                       <input type="text" v-model:value="editUrl"/>
                  </div>
                   <div class="modal-footer">
                       <div class="modal-controls">
                           <span class="btn btn-primary" v-on:click="submitLink()">{{submitTitle}}</span>
                           <span class="btn btn-secondary" v-on:click="$emit('close')">Close</span>
                       </div>
                   </div>
               </div>
           </div>
       </div>
   </transition>
</template>

<script>
export default {
    props: ['edit', 'title', 'url'],

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
