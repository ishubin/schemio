<template lang="html">
    <div>
        <h3>{{schemeContainer.scheme.name}}</h3>

        <vue-markdown>{{schemeContainer.scheme.description}}</vue-markdown>
    </div>
</template>

<script>
import VueMarkdown from 'vue-markdown';

export default {
    props: ['schemeContainer'],
    components: {VueMarkdown}
}
</script>

<style lang="css">
</style>
