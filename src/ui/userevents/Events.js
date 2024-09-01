/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export default {
    standardEvents: {
        mousein: {
            id: 'mousein',
            name: 'Mouse In'
        },
        mouseout: {
            id: 'mouseout',
            name: 'Mouse Out'
        },
        clicked: {
            id: 'clicked',
            name: 'Clicked'
        },
        init: {
            id: 'init',
            name: 'Init'
        },
        valueChange: {
            id: 'valueChange',
            name: 'Value Change',
            description: 'When the value of the item is changed with "setValue" script function'
        },
        dragStart: {
            id: 'dragStart',
            name: 'Dragging: Start',
            description: 'When user starts dragging the object'
        },
        dragEnd: {
            id: 'dragEnd',
            name: 'Dragging: End',
            description: 'When user stops dragging the object. It is invoked even if user drops the object in non-designated area and the dragging is canceled'
        },
        drag: {
            id: 'drag',
            name: 'Dragging: Move',
            description: 'Invoked every time user moves the dragged item'
        },
        drop: {
            id: 'drop',
            name: 'Dragging: Dropped',
            description: 'When user drops the object into a designated area'
        },
        receiveDrop: {
            id: 'receiveDrop',
            name: 'Dragging: Receive',
            description: 'When user drops another object into this one'
        },
        dragObjectIn: {
            id: 'dragObjectIn',
            name: 'Dragging: Object In',
            description: 'When user drags an object into another designated drop object'
        },
        dragObjectOut: {
            id: 'dragObjectOut',
            name: 'Dragging: Object Out',
            description: 'When user drags an object away from another designated drop object'
        }
    }
}