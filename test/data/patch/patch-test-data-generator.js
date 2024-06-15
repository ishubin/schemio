/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import utils from "../../../src/ui/utils";


// This script is used for generating random permutations to various structures
// and stores test data for patcher spec



const origin = {
    name: 'origin',
    description: '',
    items: Array.from(Array(10).keys()).map(i => {
        return {
            id: 'id' + i,
            name: 'item ' + i,
            shape: 'rect',
            shapeProps: {}
        }
    })
};

const modified = utils.clone(origin);


console.log(modified);

