<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div class="system-message-panel">
        <div class="messages">
            <transition name="system-message" v-for="msg in systemMessages" :key="`system-message-${msg.id}`">
                <div class="message" :class="[`message-${msg.status}`]">
                    <span class="close-button" @click="closeMessage(msg.id)"><i class="fas fa-times"/></span>
                    <i v-if="msg.iconClass" :class="msg.iconClass"></i>
                    <span>{{msg.message}}</span>
                </div>
            </transition>
        </div>

    </div>
</template>

<script>
import StoreUtils from '../store/StoreUtils';

export default {

    methods: {
        closeMessage(id) {
            StoreUtils.removeSystemMessage(this.$store, id);
        }
    },

    computed: {
        systemMessages() {
            return this.$store.getters.systemMessages;
        }
    }
}
</script>