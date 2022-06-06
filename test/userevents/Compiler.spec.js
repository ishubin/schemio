
import Compiler from '../../src/ui/userevents/Compiler.js';
import expect from 'expect';

const mockedUserEventBus = {
    isActionAllowed() {
        return true;
    }
}

describe('UserEvents Compiler', () => {
    it('should compile simple actions for items', () => {
        const compiler = new Compiler();
        const selfItem = {
            id: 'qwe',
            opacity: 1.0
        };
        const abcItem = {
            id: 'abc'
        };
        const schemeContainer = {
            findElementsBySelector(selector, selfItem2) {
                if (selector === 'self') {
                    return [ selfItem2 ];
                }
                if (selector === '#abc') {
                    return [ abcItem ];
                }
                throw new Error('Unknown selector');
            }
        };

        const action = compiler.compileActions(schemeContainer, selfItem, [{
            element: 'self',
            method: 'set',
            args: { field: 'opacity', value: 0.5}
        }, {
            element: '#abc',
            method: 'set',
            args: { field: 'shapeProps.strokeSize', value: 2}
        }, {
            element: '#abc',
            method: 'set',
            args: {field: 'shapeProps.text', value: 'Blah'}
        }]);

        action(mockedUserEventBus);

        expect(selfItem).toStrictEqual({
            id: 'qwe',
            opacity: 0.5
        });
        expect(abcItem).toStrictEqual({
            id: 'abc',
            shapeProps: {
                text: 'Blah',
                strokeSize: 2
            }
        });
    });


    it('should compile actions for item tags', () => {
        const compiler = new Compiler();
        const selfItem = {id: 'self-item-id'};
        const items = [{
            id: 'qwe',
            opacity: 1.0
        }, {
            id: 'zxc',
            opacity: 0.6
        }, {
            id: 'ert',
            opacity: 1.0
        }];
        const schemeContainer = {
            findElementsBySelector(selector, selfItem) {
                if (selector === 'tag: my-group') {
                    return [items[0], items[1]];
                } else if (selector === 'tag: another-group') {
                    return [items[2]];
                }
                return [];
            }
        };

        const action = compiler.compileActions(schemeContainer, selfItem, [{
            element: 'tag: my-group',
            method: 'set',
            args: { field: 'opacity', value: 0.5}
        }, {
            element: 'tag: another-group',
            method: 'set',
            args: { field: 'someField', value: 'blah'}
        }]);

        action(mockedUserEventBus);

        expect(items).toStrictEqual([{
            id: 'qwe',
            opacity: 0.5
        }, {
            id: 'zxc',
            opacity: 0.5
        }, {
            id: 'ert',
            opacity: 1.0,
            someField: 'blah'
        }]);
    });
});