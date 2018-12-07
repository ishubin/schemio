<template lang="html">
    <transition name="modal">
       <div class="modal-mask">
           <div class="modal-wrapper">
               <div class="modal-container">
                   <div class="modal-header">
                       <h3>{{title}}</h3>
                   </div>
                   <div class="modal-body">
                       <slot></slot>
                  </div>
                   <div class="modal-footer">
                       <div class="modal-controls">
                           <span class="btn btn-primary" v-if="primaryButton" v-on:click="$emit('primary-submit')">{{primaryButton}}</span>
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
    props: {
        title: String,
        primaryButton: {
            type: String,
            default: null
        }
    }
}
</script>

<style lang="css">
</style>
