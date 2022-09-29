/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


/*
    The following constants were moved from Item.js file.
    It was necessary due to webpack for some reason not handling the dependencies in test scope
    In the main bundle everything was ok.
*/
//TODO move the rest of the constants here in a such way that this file does not depend on other scripts
export const knownBlendModes = ['normal', 'multiply', 'screen', 'overlay', 'darken', 
                    'lighten', 'color-dodge', 'color-burn', 'difference',
                    'exclusion', 'hue', 'saturation', 'color', 'luminosity'
];

