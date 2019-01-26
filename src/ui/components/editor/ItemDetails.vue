<template lang="html">
    <div class="item-details">
        <h3>{{item.name}}</h3>

        <vue-markdown :source="item.description" class="markdown"/>

        <div v-if="item.links && item.links.length > 0">
            <h5>Links</h5>
            <ul class="links">
                <li v-for="(link, linkId) in item.links">
                    <a class="link" :href="link.url" target="_blank">
                       <i v-if="link.type === 'graphs'" class="fas fa-chart-line"></i>
                       <i v-if="link.type === 'logs'" class="fas fa-stream"></i>
                       <i v-if="link.type === 'scheme'" class="fas fa-project-diagram"></i>
                       <i v-if="link.type === 'default'" class="fas fa-link"></i>
                        {{link.title}}
                    </a>
                </li>
            </ul>
        </div>
    </div>
</template>

<script>
import VueMarkdown from 'vue-markdown';

export default {
    props: ['item', 'itemId'],
    components: {VueMarkdown},
}
</script>

<style lang="css">
</style>
