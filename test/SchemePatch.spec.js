import { applyArrayPatch, applyMapPatch, applySchemePatch, applyStringPatch, arrayLCS, generateArrayPatch, generateMapPatch, generatePatchStatistic, generateSchemePatch, generateStringPatch, leastMutationsForArray, stringLCS } from '../src/ui/scheme/SchemePatch'
import expect from 'expect';
import { forEach } from '../src/ui/collections';
import { patchTestData } from './data/patch/patch-test-data';
import fs from 'fs-extra';


describe('SchemePatch.generateSchemePatch', () => {
    forEach(patchTestData, testData => {
        it(`should recognize ${testData.name}`, () => {
            const patch = generateSchemePatch(testData.origin, testData.modified);
            expect(patch).toStrictEqual(testData.patch);
        });
    });


    it('should not put "ignored" fields when adding new items', () => {
        const origin = {
            name: 'origin',
            items: []
        };

        const modified = {
            name: 'origin',
            items: [{
                id: 'qwe',
                name: 'qwe',
                meta: {parentId: null, collapsed: true},
                shape: 'rect',
                shapeProps: {
                    strokeColor: 'rgba(0,0,0,1.0)'
                },
                childItems: [{
                    id: 'asd',
                    name: 'asd',
                    meta: {
                        someDummyProperty: 'blah'
                    }
                }]
            }]
        };

        const patch = generateSchemePatch(origin, modified);

        expect(patch).toStrictEqual({
            version: "1",
            protocol: "schemio/patch",
            changes: [ {
                path: [
                    "items"
                ],
                op: "patch-id-array",
                changes: [ {
                    id: "qwe",
                    op: "add",
                    value: {
                        id: "qwe",
                        name: "qwe",
                        shape: "rect",
                        shapeProps: {
                            strokeColor: "rgba(0,0,0,1.0)"
                        }
                    },
                    parentId: null,
                    sortOrder: 0
                }, {
                    id: "asd",
                    op: "add",
                    value: {
                        id: "asd",
                        name: "asd"
                    },
                    parentId: "qwe",
                    sortOrder: 0
                }]
            }]
        });
    });


    it('should generate patch for frame_player shape', () => {
        const origin = JSON.parse(fs.readFileSync('test/data/patch/frame-player.origin.json'));
        const modified = JSON.parse(fs.readFileSync('test/data/patch/frame-player.modified.json'));
        const patch = generateSchemePatch(origin, modified);

        expect(patch).toStrictEqual( {
            version: "1",
            protocol: "schemio/patch",
            changes: [ {
                path: [ "items" ],
                op: "patch-id-array",
                changes: [ {
                    id: "TNrdJ9bqq",
                    op: "modify",
                    changes: [ {
                        path: [ "shapeProps", "animations" ],
                        op: "patch-id-array",
                        changes: [ {
                            id: "vewtw4",
                            op: "modify",
                            changes: [ {
                                path: [ "frames" ],
                                op: "patch-array",
                                patch: {
                                    replace: [ [ 1, { frame: 3, value: 0, kind: "linear" } ] ]
                                }
                            } ]
                        } ]
                    } ]
                } ]
            } ]
        });
    });

    it('it should ignore field changes for values that don\'t match type in schema', () => {
        const origin = {
            name: 'doc name',
            description: 'doc description',
            items: [{
                id: 'qwe',
                name: 'item qwe',
                shape: 'connector',
                shapeProps: {
                    strokeColor: 'rgba(255, 255, 255, 0.5)',
                    strokeSize: 12,
                    points: []
                },
            }, {
                id: 'zxc',
                shape: 'connector',
                shapeProps: {
                    points: []
                }
            }]
        };

        const modified = {
            name: 'doc name',
            description: 'doc description',
            items: [{
                id: 'qwe',
                name: 'item qwe modified',
                shape: 'connector',
                shapeProps: {
                    strokeColor: 45,
                    strokeSize: '14',
                    points: ['invalid point']
                }
            }, {
                id: 'zxc',
                shape: 'connector',
                shapeProps: {
                    points: [{x: 1, y: 5}]
                }
            }]
        };

        const patch = generateSchemePatch(origin, modified);

        expect(patch).toStrictEqual({
            version: '1',
            protocol: 'schemio/patch',
            changes: [{
                path: ['items'],
                op: 'patch-id-array',
                changes: [{
                    id: 'qwe', op: 'modify',
                    changes: [{ path: ['name'], op: 'patch-text', patch: {delete: [], add: [[8, ' modified']]} }]
                }, {
                    id: 'zxc', op: 'modify',
                    changes: [{path: ['shapeProps', 'points'], op: 'patch-array', patch: {add: [[0, [{x: 1, y: 5}]]]}}]
                }]
            }]
        });
    });


    it('should optimize recursive items deletion', () => {
        // when user deletes parent item with multiple child items
        // the resulting patch changes should order deletion of items by deleting the lowest child first
        const origin = {
            name: 'some doc',
            description: 'some text',
            items: [{
                id: 'q1',
                childItems: [{
                    id: 'q1_1',
                    childItems: [{
                        id: 'q1_1_1'
                    }, {
                        id: 'q1_1_2'
                    }]
                }, {
                    id: 'q1_2'
                }]
            }, {
                id: 'q2'
            }]
        };

        const modified = {
            name: 'some doc',
            description: 'some text',
            items: [{
                id: 'q2'
            }]
        };

        const patch = generateSchemePatch(origin, modified);

        expect(patch).toStrictEqual({
            version: '1',
            protocol: 'schemio/patch',
            changes: [{
                path: ['items'],
                op: 'patch-id-array',
                changes: [{
                    id: 'q1_1', op: 'delete',
                }, {
                    id: 'q1_1_1', op: 'delete',
                }, {
                    id: 'q1_1_2', op: 'delete',
                }, {
                    id: 'q1_2', op: 'delete',
                }, {
                    id: 'q1', op: 'delete',
                }]
            }]
        });
    });

    it('should flatten nested new items', () => {
        const origin = {
            name: 'some doc',
            description: 'some text',
            items: [{
                id: 'q1'
            }]
        };

        const modified = {
            name: 'some doc',
            description: 'some text',
            items: [{
                id: 'q1',
            }, {
                id: 'q2',
                childItems: [{
                    id: 'q2_1',
                    childItems: [{
                        id: 'q2_1_1'
                    }, {
                        id: 'q2_1_2'
                    }]
                }, {
                    id: 'q2_2'
                }]
            }]
        };

        const patch = generateSchemePatch(origin, modified);

        expect(patch).toStrictEqual({
            version: '1',
            protocol: 'schemio/patch',
            changes: [{
                path: ['items'],
                op: 'patch-id-array',
                changes: [{
                    id: 'q2', op: 'add', sortOrder: 1, parentId: null, value: {id: 'q2'},
                }, {
                    id: 'q2_1', op: 'add', sortOrder: 0, parentId: 'q2', value: {id: 'q2_1'}
                }, {
                    id: 'q2_1_1', op: 'add', sortOrder: 0, parentId: 'q2_1', value: {id: 'q2_1_1'}
                }, {
                    id: 'q2_1_2', op: 'add', sortOrder: 1, parentId: 'q2_1', value: {id: 'q2_1_2'}
                }, {
                    id: 'q2_2', op: 'add', sortOrder: 1, parentId: 'q2', value: {id: 'q2_2'}
                }]
            }]
        });
    });


});

describe('SchemePatch.applySchemePatch', () => {
    forEach(patchTestData, testData => {
        it(`should apply patch with ${testData.name}`, () => {
            const modifiedObject = applySchemePatch(testData.origin, testData.patch);
            expect(modifiedObject).toStrictEqual(testData.modified);
        });
    });
})


describe('SchemePatch.generatePatchStatistic', () => {
    forEach(patchTestData, testData => {
        it(`should generate statistic for patch "${testData.name}"`, () => {
            const stat = generatePatchStatistic(testData.patch);
            expect(stat).toStrictEqual(testData.stats);
        });
    });
});

describe('SchemePatch.stringLCS', () => {
    it('should generate longest common subsequence for strings', () => {
        const lcs = stringLCS('Hello world!', 'Hi world ?');
        expect(lcs).toEqual(' world');
    });
});

describe('SchemePatch.arrayLCS', () => {
    it('should generate longest common subsequence for arrays', () => {
        const lcs = arrayLCS(
            ['should','generate','longest','common','subsequence','for','arrays'],
            ['it','should','generate','common','subsequence','string', 'arrays'],
            (a,b) => a === b
        );
        expect(lcs).toEqual(['should','generate','common','subsequence','arrays']);
    });
});

describe('SchemePatch.generateStringPatch', () => {
    it('should generate patch for string', () => {
        const patch = generateStringPatch('Hello world!', 'Hi my world ?');
        expect(patch).toStrictEqual({
            delete: [[0, 5], [11, 1]],
            add: [[0, 'Hi'], [3, 'my '], [11, ' ?']],
        });
    });
});

describe('SchemePatch.applyStringPatch', () => {
    it('should apply deletions to a string', () => {
        const modified = applyStringPatch('Hello world!', {
            delete: [[1, 4]],
            add: []
        });
        expect(modified).toEqual('H world!');
    });

    it('should apply deletions to a string 2', () => {
        const modified = applyStringPatch('Hello world!', {
            delete: [[1, 4], [11, 1]],
            add: []
        });
        expect(modified).toEqual('H world');
    });

    it('should not apply deletions to a string when index is out of range', () => {
        const modified = applyStringPatch('Hello world!', {
            delete: [[100, 4]],
            add: []
        });
        expect(modified).toEqual('Hello world!');
    });

    it('should apply additions to a string', () => {
        const modified = applyStringPatch('H world', {
            delete: [],
            add: [[1, 'i'], [3, 'my '], [11, ' ?']],
        });
        expect(modified).toEqual('Hi my world ?');
    });

    it('should apply additions to a string 2', () => {
        const modified = applyStringPatch('Hello world', {
            delete: [],
            add: [[0, 'ab'], [200, 'cd']],
        });
        expect(modified).toEqual('abHello worldcd');
    });

    it('should apply string patch to a string', () => {
        const modified = applyStringPatch('Hello world!', {
            delete: [[1, 4], [11, 1]],
            add: [[1, 'i'], [3, 'my '], [11, ' ?']],
        });
        expect(modified).toEqual('Hi my world ?');
    });
});


describe('SchemaPatch.generateArrayPatch', () => {
    it('should generate patch for arrays', () => {
        const patch = generateArrayPatch(
            [{x:0, y:0}, {x:1, y:3}, {x:2, y:3},  {x:0, y:2}, {x:6, y:9}, {x:-1, y:0.0002}, {x:20, y:0}],
            [{x:2, y:3}, {x:10, y:6}, {x:0, y:2}, {x:7, y:1}, {x:11, y:11}, {x:-3, y:-3}, {x:-4, y:-4}, {x: 20, y:0}, {x:-5, y:-5}]
        );

        expect(patch).toStrictEqual({
            delete: [ [0, 2] ],
            replace: [ [4, {x:7, y:1}], [5, {x:11, y:11}] ],
            add: [ [1, [{x:10, y:6}]], [5, [{x:-3, y:-3}, {x:-4, y:-4}]], [8, [{x:-5, y:-5}]] ]
        });
    })
});

describe('SchemaPatch.applyArrayPatch', () => {
    it('should patch array', () => {
        const origin = [{x:0, y:0}, {x:1, y:3}, {x:2, y:3},  {x:0, y:2}, {x:6, y:9}, {x:-1, y:0.0002}, {x:20, y:0}];
        const expected = [{x:2, y:3}, {x:10, y:6}, {x:0, y:2}, {x:7, y:1}, {x:11, y:11}, {x:-3, y:-3}, {x:-4, y:-4}, {x: 20, y:0}, {x:-5, y:-5}];
        const patch = {
            delete: [ [0, 2] ],
            replace: [ [4, {x:7, y:1}], [5, {x:11, y:11}] ],
            add: [ [1, [{x:10, y:6}]], [5, [{x:-3, y:-3}, {x:-4, y:-4}]], [8, [{x:-5, y:-5}]] ]
        };

        const real = applyArrayPatch(origin, patch);
        expect(real).toStrictEqual(expected);
    })
});



describe('SchemaPatch.generateMapPatch', () => {
    it('should generate patch for maps', () => {
        const schema = {patching: ['patch-map'], fields: {
            functionId: {type: 'string', patching: ['replace']},
            args: {type: 'object', patching: ['modify'], fields: {'*': {patching: ['replace']}}}
        }};

        const origin = {
            "qwe": {
                functionId: 'show',
                args: {
                    animated: true,
                    duration: 1.2
                }
            },
            "zxc": {
                functionId: 'somefunc',
                args: {
                    animated: false,
                    oldProperty: 'qwe'
                }
            }
        };
        const modified = {
            "asd": {
                functionId: 'somefunc',
                args: {
                    someValue: 'blah'
                }
            },
            "zxc": {
                functionId: 'hide',
                args: {
                    animated: true,
                    duration: 0.4
                }
            }
        };
        const patch = generateMapPatch(origin, modified, schema);

        expect(patch).toStrictEqual([{
            id: 'qwe',
            op: 'delete'
        }, {
            id: 'zxc',
            op: 'modify',
            changes: [{
                path: ['functionId'],
                op: 'replace',
                value: 'hide'
            }, {
                path: ['args', 'oldProperty'],
                op: 'delete',
            }, {
                path: ['args', 'animated'],
                op: 'replace',
                value: true
            }, {
                path: ['args', 'duration'],
                op: 'replace',
                value: 0.4
            }]
        }, {
            id: 'asd',
            op: 'add',
            value: {
                functionId: 'somefunc',
                args: {
                    someValue: 'blah'
                }
            }
        }]);
    });
});

describe('SchemaPatch.applyMapPatch', () => {
    it('should apply patch for maps', () => {
        const origin = {
            "qwe": {
                functionId: 'show',
                args: {
                    animated: true,
                    duration: 1.2
                }
            },
            "zxc": {
                functionId: 'somefunc',
                args: {
                    animated: false,
                    oldProperty: 'qwe'
                }
            }
        };
        const expectedModified = {
            "asd": {
                functionId: 'somefunc',
                args: {
                    someValue: 'blah'
                }
            },
            "zxc": {
                functionId: 'hide',
                args: {
                    animated: true,
                    duration: 0.4,
                }
            }
        };
        const patch = [{
            id: 'qwe',
            op: 'delete'
        }, {
            id: 'zxc',
            op: 'modify',
            changes: [{
                path: ['functionId'],
                op: 'replace',
                value: 'hide'
            }, {
                path: ['args', 'animated'],
                op: 'replace',
                value: true
            }, {
                path: ['args', 'oldProperty'],
                op: 'delete',
            }, {
                path: ['args', 'duration'],
                op: 'replace',
                value: 0.4
            }]
        }, {
            id: 'asd',
            op: 'add',
            value: {
                functionId: 'somefunc',
                args: {
                    someValue: 'blah'
                }
            }
        }];

        const realModified = applyMapPatch(origin, patch, [], null);
        expect(realModified).toStrictEqual(expectedModified);
    });
});


describe('SchemioPatch.leastMutationsForArray', () => {
    it('generate most optimal array mutations for string arrays', () => {
        const originText = 'Hello  world';
        const modifiedText = 'Hi woorld!';
        const mutations = leastMutationsForArray(textToArray(originText), textToArray(modifiedText), (a, b) => a === b);
        expect(mutations).toStrictEqual([
            [1, 0], [2, 0], [3, 0], [4, 0],  [5, 1, 'i'], [9, 2, 'o'], [12, 2, '!']
        ]);
    });
});

/**
 *
 * @param {String} text
 * @returns {Array}
 */
function textToArray(text) {
    const arr = [];
    for (let i = 0; i < text.length; i++) {
        arr.push(text.charAt(i));
    }
    return arr;
}