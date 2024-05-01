import expect from 'expect';
import { processJSONTemplate } from '../../src/ui/templater/templater';
import { List } from '../../src/ui/templater/list';



describe('templater', () => {
    it('should process expressions in json template', () => {
        const result = processJSONTemplate({
            items: [{
                area: {
                    x: {'$-expr': 'x + 10 * y'},
                    y: {'$-expr': '-y'}
                }
            }, {
                area: {
                    x: 1, y: 5
                }
            }]
        }, {x: 3, y: 10});

        expect(result).toStrictEqual({
            items: [{
                area: {x: 103, y: -10}
            }, {
                area: {x: 1, y: 5}
            }]
        })
    });

    it('should process string expressions in json template', () => {
        const result = processJSONTemplate({
            items: [{
                name: {'$-str': 'id: ${id * 1000}, name: ${name}'}
            }, {
                name: 'item 2'
            }]
        }, {id: 2, name: 'john'});

        expect(result).toStrictEqual({
            items: [{
                name: 'id: 2000, name: john'
            }, {
                name: 'item 2'
            }]
        })
    });


    it('should process conditions in array', () => {
        const template = {
            items: [{
                name: '1'
            }, {
                name: '2',
                '$-if': "animation == 'simple' || animation == 'scaled'"
            }, {
                name: '3'
            }]
        };

        [
            [{animation: 'simple'}, '1,2,3'],
            [{animation: 'scaled'}, '1,2,3'],
            [{animation: 'other'}, '1,3'],
        ]
        .forEach(([data, expectedNames]) => {
            const result = processJSONTemplate(template, data);
            expect(result.items.map(x => x.name).join(',')).toBe(expectedNames);
        });
    });

    it('should process $-else conditions in array', () => {
        const template = {
            items: [{
                name: '1'
            }, {
                name: '2',
                '$-if': "animation == 'simple' || animation == 'scaled'"
            }, {
                name: '2_',
                '$-else': ''
            }]
        };

        [
            [{animation: 'simple'}, '1,2'],
            [{animation: 'scaled'}, '1,2'],
            [{animation: 'other'}, '1,2_'],
        ]
        .forEach(([data, expectedNames]) => {
            const result = processJSONTemplate(template, data);
            expect(result.items.map(x => x.name).join(',')).toBe(expectedNames);
        });
    });

    it('should process $-else-if conditions in array', () => {
        const template = {
            items: [{
                name: '1'
            }, {
                name: '2',
                '$-if': 'animation == "simple" || animation == "scaled"'
            }, {
                name: '2_',
                '$-else-if': 'pos == "centered"'
            }, {
                name: '_2',
                '$-else': '',
            }]
        };

        [
            [{animation: 'simple', pos: 'centered'}, '1,2'],
            [{animation: 'scaled', pos: 'centered'}, '1,2'],
            [{animation: 'other', pos: 'centered'}, '1,2_'],
            [{animation: 'other', pos: 'stretched'}, '1,_2'],
        ]
        .forEach(([data, expectedNames]) => {
            const result = processJSONTemplate(template, data);
            expect(result.items.map(x => x.name).join(',')).toBe(expectedNames);
        });
    });

    it('should process for loops in array', () => {
        const template = {
            items: [{
                name: 'a'
            }, {
                '$-for': {start: -1, until: {'$-expr': 'num'}, step: 1, it: 'x'},
                name: 'f',
                x: {'$-expr': 'x * 2 + margin'}
            }, {
                name: 'b'
            }]
        }

        expect(processJSONTemplate(template, {num: 3, margin: 100})).toStrictEqual({
            items: [{
                name: 'a'
            }, {
                name: 'f', x: 98
            }, {
                name: 'f', x: 100
            }, {
                name: 'f', x: 102
            }, {
                name: 'f', x: 104
            }, {
                name: 'b'
            }]
        });
    });


    it('should process forEach loops in array by iterating a List object', () => {
        const template = {
            items: [{
                name: 'a'
            }, {
                '$-foreach': {source: 'myList', it: 'x'},
                name: 'f',
                x: {'$-expr': 'x'}
            }, {
                name: 'b'
            }]
        };

        expect(processJSONTemplate(template, {myList: new List(4, 6, 1), margin: 100})).toStrictEqual({
            items: [{
                name: 'a'
            }, {
                name: 'f', x: 4
            }, {
                name: 'f', x: 6
            }, {
                name: 'f', x: 1
            }, {
                name: 'b'
            }]
        });
    });


    it('should process forEach loops in array by iterating an array', () => {
        const template = {
            items: [{
                name: 'a'
            }, {
                '$-foreach': {source: 'myArr', it: 'x'},
                name: 'f',
                x: {'$-expr': 'x'}
            }, {
                name: 'b'
            }]
        };

        expect(processJSONTemplate(template, {myArr: [4, 6, 1], margin: 100})).toStrictEqual({
            items: [{
                name: 'a'
            }, {
                name: 'f', x: 4
            }, {
                name: 'f', x: 6
            }, {
                name: 'f', x: 1
            }, {
                name: 'b'
            }]
        });
    });

    it('should run expressions in eval with assigning values to new variables', () => {
        const template = {
            '$-eval': ['x = 45', 'y = 3'],
            items: [{
                name: {'$-str': 'name: ${x}'}
            }, {
                name: {'$-str': 'name: ${y}'}
            }]
        };

        expect(processJSONTemplate(template, {y: 6})).toStrictEqual({
            items: [{
                name: 'name: 45'
            }, {
                name: 'name: 3'
            }]
        });
    });


    it('should allow to reference special fields higher in objects hierarchy', () => {
        const template = {
            '$-def:q1': 'This is simple text',
            '$-def:q2': ['This', 'is', 'array'],
            '$-def:q3': { '$-expr': 'idx * 2 + 1' },
            items: [{
                name: {'$-ref': 'q1'},
                tags: {'$-ref': 'q2'},
            }, {
                '$-for': {start: 0, until: 2, it: 'idx'},
                name: {'$-str': 'item ${idx}'},
                size: {'$-ref': 'q3'}
            }]
        }

        expect(processJSONTemplate(template, {})).toStrictEqual({
            items: [{
                name: 'This is simple text',
                tags: ['This', 'is', 'array']
            }, {
                name: 'item 0',
                size: 1
            }, {
                name: 'item 1',
                size: 3
            }]
        });
    });


    it('should support recursive structures with List type children', () => {
        const recursiveObject = {
            id: 'root',
            name: 'root item',
            x: 0, y: 10,
            childItems: new List({
                id: 'c1',
                name: 'c1 item',
                x: 100, y: -5,
                childItems: new List({
                    id: 'c1_1',
                    name: 'c1_1 item',
                    x: 10, y: 5,
                })
            }, {
                id: 'c2',
                name: 'c2 item',
                x: 5, y: 6
            })
        }

        const template = {
            items: [{
                '$-recurse': {object: {'$-expr': 'someObject'}, it: 'x', children: 'x.childItems', dstChildren: 'childItems'},
                id: {'$-expr': 'x.id'},
                name: {'$-expr': 'x.name'},
                area: {
                    x: {'$-expr': 'x.x'},
                    y: {'$-expr': 'x.y'},
                }
            }]
        };

        expect(processJSONTemplate(template, {
            someObject: recursiveObject,
        })).toStrictEqual({
            items: [{
                id: 'root',
                name: 'root item',
                area: {x: 0, y: 10},
                childItems: [{
                    id: 'c1',
                    name: 'c1 item',
                    area: {x: 100, y: -5},
                    childItems: [{
                        id: 'c1_1',
                        name: 'c1_1 item',
                        area: {x: 10, y: 5},
                    }]
                }, {
                    id: 'c2',
                    name: 'c2 item',
                    area: {x: 5, y: 6}
                }]
            }]
        });
    });

    it('should support recursive structures with Array type children', () => {
        const recursiveObject = {
            id: 'root',
            name: 'root item',
            x: 0, y: 10,
            childItems: [{
                id: 'c1',
                name: 'c1 item',
                x: 100, y: -5,
                childItems: [{
                    id: 'c1_1',
                    name: 'c1_1 item',
                    x: 10, y: 5,
                }]
            }, {
                id: 'c2',
                name: 'c2 item',
                x: 5, y: 6
            }]
        }

        const template = {
            items: [{
                '$-recurse': {object: {'$-expr': 'someObject'}, it: 'x', children: 'x.childItems', dstChildren: 'childItems'},
                id: {'$-expr': 'x.id'},
                name: {'$-expr': 'x.name'},
                area: {
                    x: {'$-expr': 'x.x'},
                    y: {'$-expr': 'x.y'},
                }
            }]
        };

        expect(processJSONTemplate(template, {
            someObject: recursiveObject,
        })).toStrictEqual({
            items: [{
                id: 'root',
                name: 'root item',
                area: {x: 0, y: 10},
                childItems: [{
                    id: 'c1',
                    name: 'c1 item',
                    area: {x: 100, y: -5},
                    childItems: [{
                        id: 'c1_1',
                        name: 'c1_1 item',
                        area: {x: 10, y: 5},
                    }]
                }, {
                    id: 'c2',
                    name: 'c2 item',
                    area: {x: 5, y: 6}
                }]
            }]
        });
    });

    it('should support extending of object with fields from another object', () => {
        const someItems = [{
            name: 'some item',
            id: 1,
            shapeProps: {
                fill: {
                    type: 'solid',
                    color: 'rgba(0, 0, 0, 0)'
                }
            }
        }, {
            name: 'some item 2',
            id: 2,
            shapeProps: {
                fill: {
                    type: 'none'
                }
            }
        }];
        const template = {
            items: [{
                '$-foreach': {source: 'someItems', it: 'item'},
                '$-extend': {'$-expr': 'toJSON(item)'},
                id: {'$-expr': 'item.id + 100'},
                shape: 'rect'
            }]
        };

        expect(processJSONTemplate(template, {
            someItems,
        })).toStrictEqual({
            items: [{
                name: 'some item',
                id: 101,
                shape: 'rect',
                shapeProps: {
                    fill: {
                        type: 'solid',
                        color: 'rgba(0, 0, 0, 0)'
                    }
                }
            }, {
                name: 'some item 2',
                id: 102,
                shape: 'rect',
                shapeProps: {
                    fill: {
                        type: 'none'
                    }
                }
            }]
        });
    });

    it('should support recursive structures with mixed child items', () => {
        const recursiveObject = {
            id: 'root',
            name: 'root item',
            x: 0, y: 10,
            childItems: new List({
                id: 'c1',
                name: 'c1 item',
                x: 100, y: -5,
                childItems: new List({
                    id: 'c1_1',
                    name: 'c1_1 item',
                    x: 10, y: 5,
                })
            }, {
                id: 'c2',
                name: 'c2 item',
                x: 5, y: 6
            })
        }

        const template = {
            items: [{
                '$-recurse': {object: {'$-expr': 'someObject'}, it: 'x', children: 'x.childItems', dstChildren: 'childItems'},
                id: {'$-expr': 'x.id'},
                name: {'$-expr': 'x.name'},
                area: {
                    x: {'$-expr': 'x.x'},
                    y: {'$-expr': 'x.y'},
                },
                childItems: [{
                    id: {'$-str': '${x.id}-connector'},
                    name: {'$-str': '${x.name} connector'}
                }]
            }]
        };

        expect(processJSONTemplate(template, {
            someObject: recursiveObject,
        })).toStrictEqual({
            items: [{
                id: 'root',
                name: 'root item',
                area: {x: 0, y: 10},
                childItems: [{
                    id: 'root-connector',
                    name: 'root item connector'
                },{
                    id: 'c1',
                    name: 'c1 item',
                    area: {x: 100, y: -5},
                    childItems: [{
                        id: 'c1-connector',
                        name: 'c1 item connector'
                    },{
                        id: 'c1_1',
                        name: 'c1_1 item',
                        area: {x: 10, y: 5},
                        childItems: [{
                            id: 'c1_1-connector',
                            name: 'c1_1 item connector'
                        }]
                    }]
                }, {
                    id: 'c2',
                    name: 'c2 item',
                    area: {x: 5, y: 6},
                    childItems: [{
                        id: 'c2-connector',
                        name: 'c2 item connector'
                    }]
                }]
            }]
        });
    });
});
