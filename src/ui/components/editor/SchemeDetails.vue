<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div>
        <ul class="category-breadcrumb" v-if="schemeContainer.scheme.category">
            <li>
                <router-link :to="{path: '/'}">
                    <a href="#"><i class="fas fa-home"></i></a>
                </router-link>
                <i class="fas fa-angle-right"></i>
            </li>
            <li v-for="category in schemeContainer.scheme.category.ancestors">
                <router-link :to="{ path: '/?category=' + category.id }">
                    <a href="#">{{category.name}}</a>
                </router-link>
                <i class="fas fa-angle-right"></i>
            </li>
            <li>
                <router-link :to="{ path: '/?category=' + schemeContainer.scheme.category.id }">
                    <a href="#">{{schemeContainer.scheme.category.name}}</a>
                </router-link>
            </li>
        </ul>
        <h3>{{schemeContainer.scheme.name}}</h3>

        <div v-html="sanitizedDescription"></div>
    </div>
</template>

<script>
import htmlSanitize from '../../../htmlSanitize.js';

export default {
    props: ['schemeContainer'],

    computed: {
        sanitizedDescription() {
            return htmlSanitize(this.schemeContainer.scheme.description);
        }
    }
}
</script>

<style lang="css">
</style>
