/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

export function createDelayer(timeoutInMillis, callback) {
    return {
        timerId: null,
        timeoutInMillis,

        trigger() {
            if (this.timerId) {
                clearTimeout(this.timerId);
            }
            this.timerId = setTimeout(() => {
                this.timerId = null;
                callback();
            }, this.timeoutInMillis);
        },

        destroy() {
            if (this.timerId) {
                clearTimeout(this.timerId);
                this.timerId = null;
            }
        }
    };
}