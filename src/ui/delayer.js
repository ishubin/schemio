/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

export function createDelayer(timeoutInMillis, callback) {
    let timerId = null;

    return {
        lastUpdatedTime: -1,

        trigger() {
            if (this.lastUpdatedTime < 0 || (performance.now() - this.lastUpdatedTime) > timeoutInMillis) {
                this.lastUpdatedTime = performance.now();
                callback();
            } else {
                if (!timerId) {
                    timerId = setTimeout(() => {
                        timerId = null;
                        this.lastUpdatedTime = performance.now();
                        callback();
                    }, timeoutInMillis);
                }
            }
        },

        destroy() {
            if (timerId) {
                clearTimeout(timerId);
                timerId = null;
            }
        }
    };
}