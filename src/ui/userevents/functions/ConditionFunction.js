/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { createItemBasedScope, parseItemScript } from "./ScriptFunction";


const conditionBranchOptions = ['pass', 'skip-next', 'break-event'];

export default {
    name: 'Condition',

    description: 'Checkes whether user defined expressions returns true and executes specified command',

    args: {
        expression: {name: 'Expression', type: 'script', value: '', description: 'A Schemio script expression that is executed as part of condition'},
        success   : {name: 'If true', type: 'choice', value: 'pass', options: conditionBranchOptions},
        fail      : {name: 'Else', type: 'choice', value: 'pass', options: conditionBranchOptions}
    },

    argsToShortString(args) {
        return `${args.success} if ${args.expression} else ${args.fail}`;
    },

    executeWithBranching(item, args, schemeContainer, userEventBus, resultCallback) {
        const scriptAST = parseItemScript(args.expression);
        if (!scriptAST) {
            resultCallback({skip: 0, break: false});
            return;
        }

        const handleBranch = (op) => {
            if (op === 'pass') {
                resultCallback({skip: 0, break: false});
            } else if (op === 'skip-next') {
                resultCallback({skip: 1, break: false});
            } else if (op === 'break-event') {
                resultCallback({skip: 0, break: true});
            } else {
                resultCallback({skip: 0, break: false});
            }
        };

        const scope = createItemBasedScope(item, schemeContainer, userEventBus);
        try {
            const result = scriptAST.evalNode(scope);

            if (result) {
                handleBranch(args.success);
            } else {
                handleBranch(args.fail);
            }
        } catch (err) {
            console.error(err);
            resultCallback({skip: 0, break: false});
            return;
        }
    }
}
