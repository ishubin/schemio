<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <transition name="modal">
       <div class="modal-mask">
           <div class="modal-wrapper">
               <div class="modal-container" :style="{width: width + 'px'}">
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
        width: {
            type: Number,
            default: 600
        },
        primaryButton: {
            type: String,
            default: null
        }
    },
    mounted() {
        document.addEventListener('keydown', this.onKeyPress);
    },
    beforeDestroy() {
        document.removeEventListener('keydown', this.onKeyPress);
    },

    methods: {
        onKeyPress(event) {
            if (event.key === 'Escape') {
                this.$emit('close');
            }    
        }
    }
}
</script>

<style lang="css">
</style>
