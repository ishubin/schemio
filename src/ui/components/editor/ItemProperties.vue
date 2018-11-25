<template lang="html">
    <div class="">
        <h3>{{item.name}}</h3>

        <h5 v-if="item.links && item.links.length > 0">Links</h5>
        <ul class="links">
            <li v-for="link in item.links">
                <a class="link" :href="link.url" target="_blank">{{link.title}}</a>
            </li>
        </ul>

        <h5>Description</h5>
        <p class="description">{{item.description}}</p>
    </div>
</template>

<script>
export default {
    props: ['item'],
    data() {
        return {};
    }
}
</script>

<style lang="css">
</style>
