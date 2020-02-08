
import Compiler from '../../src/ui/userevents/Compiler.js';
import expect from 'expect';


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
            findItemById(id) {
                if (id === 'abc') {
                    return abcItem;
                }
            }
        };

        const action = compiler.compileActions(schemeContainer, selfItem, [{
            element: {item: 'self'},
            method: 'set',
            args: { field: 'opacity', value: 0.5}
        }, {
            element: {item: 'abc'},
            method: 'set',
            args: { field: 'shapeProps.strokeSize', value: 2}
        }, {
            element: {item: 'abc'},
            method: 'set',
            args: {field: 'shapeProps.text', value: 'Blah'}
        }]);

        action();

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


    it('should compile simple actions for item connectors', () => {
        const compiler = new Compiler();
        const selfItem = {
            id: 'qwe',
            opacity: 1.0,
            connectors: [{
                id: 'c1',
                style: { color: '#333' }
            }, {
                id: 'c2',
                style: { color: '#000' }
            }]
        };
        const abcItem = {
            id: 'abc',
            connectors: [{
                id: 'b1',
                style: { color: '#444' }
            }, {
                id: 'b2',
                style: { color: '#000' }
            }, {
                id: 'b3',
                style: { color: '#555' }
            }]
        };
        const schemeContainer = {
            findItemById(id) {
                if (id === 'abc') {
                    return abcItem;
                }
            },

            findConnectorById(id) {
                if (id === 'c1') {
                    return selfItem.connectors[0];
                }
                if (id === 'b1') {
                    return abcItem.connectors[0];
                }
                if (id === 'b2') {
                    return abcItem.connectors[1];
                }
            }
        };

        const action = compiler.compileActions(schemeContainer, selfItem, [{
            element: {connector: 'c1'},
            method: 'set',
            args: { field: 'style.opacity', value: 0.5}
        }, {
            element: {connector: 'b1'},
            method: 'set',
            args: {field: 'style.color', value: '#abc'}
        }, {
            element: {connector: 'b2'},
            method: 'set',
            args: {field: 'style.color', value: '#f00'}
        }]);

        action();

        expect(selfItem).toStrictEqual({
            id: 'qwe',
            opacity: 1.0,
            connectors: [{
                id: 'c1',
                style: { color: '#333', opacity: 0.5 }
            }, {
                id: 'c2',
                style: { color: '#000' }
            }]
        });
        expect(abcItem).toStrictEqual({
            id: 'abc',
            connectors: [{
                id: 'b1',
                style: { color: '#abc' }
            }, {
                id: 'b2',
                style: { color: '#f00' }
            }, {
                id: 'b3',
                style: { color: '#555' }
            }]
        });
    });
});