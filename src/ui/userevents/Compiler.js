
import _ from 'lodash';
import knownFunctions from './functions/Functions.js';
import SchemeContainer from '../scheme/SchemeContainer.js';


function createCallable(knownFunction, item, args) {
    return () => {
        knownFunction.execute(item, args);
    };
}


export default class Compiler {
    /**
     * 
     * @param {SchemeContainer} schemeContainer 
     * @param {*} selfItem 
     * @param {Array} actions 
     */
    compileActions(schemeContainer, selfItem, actions) {
        
        const funcs = [];
        _.forEach(actions, action => {
            if (knownFunctions.hasOwnProperty(action.method)) {
                let item = null;
                if (action.item === 'self') {
                    item = selfItem;
                } else if (action.item) {
                    item = schemeContainer.findItemById(action.item);
                }
                funcs.push(createCallable(knownFunctions[action.method], item, action.args));
            }
        });

        return {
            funcs,
            execute() {
                _.forEach(this.funcs, func => {
                    func();
                })
            }
        };
    }
}