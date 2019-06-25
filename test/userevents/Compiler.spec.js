
import Compiler from '../../src/ui/userevents/Compiler.js';
import expect from 'expect';


describe('UserEvents Compiler', () => {
    it('should compile simple events', () => {
        const compiler = new Compiler();
        const selfItem = {
            id: 'qwe',
            opacity: 1.0
        };
        const abcItem = {
            id: 'abc'
        };
        const schemeContainer = {
            findItemById(id) {
                if (id === 'abc') {
                    return abcItem;
                }
            }
        };

        const action = compiler.compileActions(schemeContainer, selfItem, [{
            item: 'self',
            method: 'set',
            args: ['opacity', 0.5]
        }, {
            item: 'abc',
            method: 'set',
            args: ['shapeProps.strokeSize', 2]
        }, {
            item: 'abc',
            method: 'set',
            args: ['shapeProps.text', 'Blah']
        }]);


        action.execute(schemeContainer, selfItem);


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
});