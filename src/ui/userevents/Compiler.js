
import forEach from 'lodash/forEach';
import knownFunctions from './functions/Functions.js';


export default class Compiler {

    /**
     * 
     * @param {SchemeContainer} schemeContainer 
     * @param {SchemeItem} selfItem 
     * @param {Array} actions 
     */
    compileActions(schemeContainer, selfItem, actions) {
        
        const funcs = [];
        forEach(actions, action => {
            if (knownFunctions.main.hasOwnProperty(action.method)) {
                if (action.element) {
                    const elements = schemeContainer.findElementsBySelector(action.element, selfItem);
                    if (elements) {
                        forEach(elements, element => {
                            funcs.push({
                                func: knownFunctions.main[action.method],
                                element,
                                args: action.args
                            });
                        });
                    }
                }
            }
        });

        return (userEventBus, revision) => {
            if (funcs.length < 1) {
                return;
            }

            let index = 0;
            let resultCallback = () => {
                index += 1;
                if (index >= funcs.length) {
                    return;
                }

                let f = funcs[index];
                if (userEventBus.isActionAllowed(revision)) {
                    f.func.execute(f.element, f.args, schemeContainer, userEventBus, resultCallback);
                } else {
                }
            };
            if (userEventBus.isActionAllowed(revision)) {
                funcs[0].func.execute(funcs[0].element, funcs[0].args, schemeContainer, userEventBus, resultCallback);
            }
        };
    }
}
