
import Compiler from '../../src/ui/userevents/Compiler.js';
import expect from 'expect';
import UserEventBus from '../../src/ui/userevents/UserEventBus.js';

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
            editorId: 1,
            findElementsBySelector(selector, selfItem2) {
                if (selector === 'self') {
                    return [ selfItem2 ];
                }
                if (selector === '#abc') {
                    return [ abcItem ];
                }
                throw new Error('Unknown selector');
            },

            findItemById(itemId) {
                return null;
            }
        };

        const action = compiler.compileActions(schemeContainer, selfItem, [{
            element: 'self',
            method: 'set',
            on: true,
            args: { field: 'opacity', value: 0.5}
        }, {
            element: '#abc',
            method: 'set',
            on: true,
            args: { field: 'shapeProps.strokeSize', value: 2}
        }, {
            element: '#abc',
            method: 'set',
            on: true,
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
            editorId: 1,
            findElementsBySelector(selector, selfItem) {
                if (selector === 'tag: my-group') {
                    return [items[0], items[1]];
                } else if (selector === 'tag: another-group') {
                    return [items[2]];
                }
                return [];
            },

            findItemById(itemId) {
                return null;
            }
        };

        const action = compiler.compileActions(schemeContainer, selfItem, [{
            element: 'tag: my-group',
            method: 'set',
            on: true,
            args: { field: 'opacity', value: 0.5}
        }, {
            element: 'tag: another-group',
            method: 'set',
            on: true,
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


    it('should handle script function with custom events', () => {
        [
            ['up', 7, [{
                    id: 'qwe',
                    area: {x: 10, y: 5}
                }, {
                    id: 'zxc',
                    area: {x: 10, y: 43}
                }, {
                    id: 'ert',
                    area: {x: 10, y: 70}
                }]
            ],
            ['down', 8, [{
                    id: 'qwe',
                    area: {x: 10, y: 5}
                }, {
                    id: 'zxc',
                    area: {x: 10, y: 58}
                }, {
                    id: 'ert',
                    area: {x: 10, y: 70}
                }]
            ],
        ].forEach(([argValue1, argValue2, expectedItems]) => {
            const items = [{
                id: 'qwe',
                area: {x: 10, y: 5}
            }, {
                id: 'zxc',
                area: {x: 10, y: 50}
            }, {
                id: 'ert',
                area: {x: 10, y: 70}
            }];


            const schemeContainer = {
                editorId: 1,
                findElementsBySelector(selector, selfItem) {
                    if (selector === 'self') {
                        return [ selfItem ];
                    }
                    if (selector === '#qwe') {
                        return [ items[0] ];
                    }
                    if (selector === '#zxc') {
                        return [ items[1] ];
                    }
                    if (selector === '#ert') {
                        return [ items[2] ];
                    }
                    throw new Error('Unknown selector');
                },

                findItemById(id) {
                    for (let i = 0; i < items.length; i++) {
                        if (items[i].id === id) {
                            return items[i];
                        }
                    }
                    return null;
                }
            };

            const userEventBus = new UserEventBus();

            const compiler = new Compiler();
            const action1 = compiler.compileActions(schemeContainer, items[0], [{
                element: 'self',
                method: 'script',
                on: true,
                args: {
                    script: `
                        findItemById("zxc").sendEvent("custom-move", "${argValue1}", ${argValue2})
                    `,
                    animated: false
                }
            }]);

            const action2 = compiler.compileActions(schemeContainer, items[1], [{
                element: 'self',
                method: 'script',
                on: true,
                args: {
                    script: `
                    d = ifcond(getEventArg(0) == 'up',
                            -1,
                            ifcond(getEventArg(0) == 'down', 1, 0))

                    speed = getEventArg(1)
                    setPosY(getPosY() + speed * d)
                    `,
                    animated: false
                }
            }]);

            userEventBus.subscribeItemEvent('zxc', 'custom-move', (bus, revision, itemId, eventName, args) => {
                action2(bus, revision, itemId, eventName, args);
            });


            action1(userEventBus, userEventBus.revision, 'qwe', 'clicked');

            // Deleting item args as it is used for storing pre-compiled script and we don't need to check it for equality
            items.forEach(item => delete item.args);

            expect(items).toStrictEqual(expectedItems);
        });
    });
});