<template lang="html">
    <div class="">
        <div v-if="schemeContainer.scheme">
            <h5 class="section">Name</h5>
            <input class="textfield" type="text" v-model="schemeContainer.scheme.name" placeholder="Scheme name ..."/>

            <h5 class="section">Description</h5>
            <textarea class="textfield" type="text" v-model="schemeContainer.scheme.description"></textarea>
        </div>
    </div>
</template>

<script>
export default {
    props: ['schemeContainer']
}
</script>

<style lang="css">
</style>
