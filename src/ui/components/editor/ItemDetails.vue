<template lang="html">
    <div class="item-details">
        <h3>{{item.name}}</h3>

        <vue-markdown>{{item.description}}</vue-markdown>
    </div>
</template>

<script>
import VueMarkdown from 'vue-markdown';

export default {
    props: ['item'],
    components: {VueMarkdown}
}
</script>

<style lang="css">
</style>
