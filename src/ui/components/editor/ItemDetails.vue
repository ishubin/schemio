<template lang="html">
    <div class="item-details">
        <h3>{{item.name}}</h3>

        <vue-markdown :source="item.description" class="markdown"/>

        <div v-if="item.links && item.links.length > 0">
            <h5>Links</h5>
            <ul class="links">
                <li v-for="(link, linkId) in item.links">
                    <a class="link" :href="link.url" target="_blank">
                       <i class="fas" :class="getLinkCssClass(link)"></i>
                        {{link.title}}
                    </a>
                </li>
            </ul>
        </div>
    </div>
</template>

<script>
import VueMarkdown from 'vue-markdown';
import linkTypes from './LinkTypes.js';

export default {
    props: ['item', 'itemId'],
    components: {VueMarkdown},

    methods: {
        getLinkCssClass(link) {
            return linkTypes.findTypeByNameOrDefault(link.type).cssClass;
        }
    }
}
</script>

<style lang="css">
</style>
