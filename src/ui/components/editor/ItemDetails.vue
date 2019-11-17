<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="item-details">
        <h3>{{item.name}}</h3>

        <div v-html="sanitizedItemDescription"></div>

        <div v-if="item.links && item.links.length > 0">
            <h5>Links</h5>
            <ul class="links">
                <li v-for="(link, linkId) in item.links">
                    <a class="link" :href="link.url" target="_blank">
                       <i :class="getLinkCssClass(link)"></i>
                        {{link.title}}
                    </a>
                </li>
            </ul>
        </div>
    </div>
</template>

<script>
import linkTypes from './LinkTypes.js';
import htmlSanitize from '../../../htmlSanitize';

export default {
    props: ['item', 'itemId'],

    methods: {
        getLinkCssClass(link) {
            return linkTypes.findTypeByNameOrDefault(link.type).cssClass;
        }
    },
    
    computed: {
        sanitizedItemDescription() {
            return htmlSanitize(this.item.description);
        }
    }
}
</script>

<style lang="css">
</style>
