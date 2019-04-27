<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div>
        <ul class="category-breadcrumb" v-if="schemeContainer.scheme.category">
            <li>
                <a href="/"><i class="fas fa-home"></i></a>
                <i class="fas fa-angle-right"></i>
            </li>
            <li v-for="category in schemeContainer.scheme.category.ancestors">
                <a :href="'/?category=' + category.id">{{category.name}}</a>
                <i class="fas fa-angle-right"></i>
            </li>
            <li>
                <a :href="'/?category=' + schemeContainer.scheme.category.id">{{schemeContainer.scheme.category.name}}</a>
            </li>
        </ul>
        <h3>{{schemeContainer.scheme.name}}</h3>

        <vue-markdown :source="schemeContainer.scheme.description" class="markdown"/>
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
