<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div class="header">
        <div class="header-body">
            <a href="/" class="header-caption">
                <img src="/assets/images/schemio-logo-white.small.png" height="25"/> <span>Schemio</span>
            </a>
            <div class="header-middle-section">
                <slot name="middle-section"></slot>
            </div>
        </div>
        <div class="header-loader-container">
            <slot name="loader"></slot>
        </div>
    </div>
</template>