<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="scheme-details">
        <h3>{{scheme.name}}</h3>

        <div v-html="sanitizedDescription"></div>
    </div>
</template>

<script>
import htmlSanitize from '../../../htmlSanitize.js';

export default {
    props: ['scheme'],

    data() {
        return {
        };
    },

    computed: {
        sanitizedDescription() {
            return htmlSanitize(this.scheme.description);
        }
    }
}
</script>

<style lang="css">
</style>
