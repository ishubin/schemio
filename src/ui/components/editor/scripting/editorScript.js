import { buildMainScopeFunctions, createItemByNameProvider } from "../../../scripting/main";
import { parseExpression } from "../../../templater/ast";
import { Scope } from "../../../templater/scope";
import { Vector } from "../../../templater/vector";
import UserEventBus from "../../../userevents/UserEventBus";



export function executeEditorScript(editorId, schemeContainer, script) {
    schemeContainer.outputHistory.push({
        type: 'command',
        value: script
    });

    const userEventBus = new UserEventBus(editorId);
    const scope = new Scope({
        ...buildMainScopeFunctions(schemeContainer, userEventBus)
    }, null, createItemByNameProvider(schemeContainer, userEventBus));

    let fullScript = script;
    if (schemeContainer.scheme.scripts.editor.source) {
        fullScript = schemeContainer.scheme.scripts.editor.source + '\n' + script;
    }

    const ast = parseExpression(fullScript);

    try {
        const output = ast.evalNode(scope);
        if (typeof output === 'number' || typeof output === 'string') {
            schemeContainer.outputHistory.push({
                type: 'output',
                value: String(output)
            });
        } else if (output instanceof Vector) {
            schemeContainer.outputHistory.push({
                type: 'output',
                value: `Vector(${output.x}, ${output.y})`
            });
        }

    } catch(err) {
        schemeContainer.outputHistory.push({
            type: 'error',
            value: err.message
        });
    }
}