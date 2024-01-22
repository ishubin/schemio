<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div class="script-property-container">
        <textarea class="script-editor" v-model="script" @input="$emit('changed', arguments[0].target.value)"></textarea>
        <span class="text-editor-enlarge" @click="enlarged = true"><i class="fas fa-expand"></i></span>


        <div class="textarea-enlarged-container" v-if="enlarged">
            <div class="rich-text-editor-menubar">
                <span class="btn btn-secondary action-close" @click="enlarged = false">Close</span>
            </div>
            <div class="editor-frame">
                <textarea class="script-editor" v-model="script" @input="$emit('changed', arguments[0].target.value)"></textarea>
            </div>
        </div>
    </div>
</template>

<script>

export default {
    props: {
        value: {type: String, default: ''}
    },

    data() {
        return {
            enlarged: false,
            script: this.value,
        };
    },

    watch: {
        value(value) {
            this.script = value;
        }
    }
}
</script>