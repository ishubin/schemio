<template>
    <div>
        <header-component/>
        <div class="middle-content">
            <h2>About Schemio</h2>

            <p>
                <a href="/">Schmeio</a> is an in-browser diagrams drawing app that can also be used for interface prototyping.
                It was designed with an idea that any complex solution can be mapped to a simple diagram
                and the complexity of this solution could be uncovered step by step with the help of links and dynamic behavior.
            </p>

        </div>
    </div>
</template>

<script>
import HeaderComponent from '../components/Header.vue';

export default {
    components: {HeaderComponent},
    
}
</script>