import { applyArrayPatch, applyMapPatch, applySchemePatch, applyStringPatch, arrayLCS, generateArrayPatch, generateMapPatch, generatePatchStatistic, generateSchemePatch, generateStringPatch, stringLCS } from '../src/ui/scheme/SchemePatch'
import expect from 'expect';
import { forEach } from 'lodash';
import { patchTestData } from './data/patch/patch-test-data';


describe('SchemePatch.generateSchemePatch', () => {
    forEach(patchTestData, testData => {
        it(`should recognize ${testData.name}`, () => {
            const patch = generateSchemePatch(testData.origin, testData.modified);
            expect(patch).toStrictEqual(testData.patch);
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
        expect(lcs).toEqual('H world');
    });
});

describe('SchemePatch.arrayLCS', () => {
    it('should generate longest common subsequence for arrays', () => {
        const lcs = arrayLCS(
            ['should','generate','longest','common','subsequence','for','arrays'],
            ['it','should','generate','common','subsequence','string', 'arrays']);
        expect(lcs).toEqual(['should','generate','common','subsequence','arrays']);
    });
});

describe('SchemePatch.generateStringPatch', () => {
    it('should generate patch for string', () => {
        const patch = generateStringPatch('Hello world!', 'Hi my world ?');
        expect(patch).toStrictEqual({
            delete: [[1, 4], [11, 1]], // the first number is start pos and the last number is the length of removed chars
            add: [[1, 'i'], [3, 'my '], [11, ' ?']],
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
            [{x:1, y:3}, {x:2, y:3},  {x:0, y:2}, {x:6, y:9}, {x:-1, y:0.0002}, {x:7, y:1}],
            [{x:2, y:3}, {x:10, y:6}, {x:0, y:2}, {x:7, y:1}, {x:11, y:11}, {x: 20, y:0}]
        );
        expect(patch).toStrictEqual({
            delete: [[0, 1], [3, 2]],
            add: [[1, [{x:10, y:6}]], [4, [{x:11, y:11}, {x:20, y:0}]]],
        });
    })
});

describe('SchemaPatch.applyArrayPatch', () => {
    it('should patch array', () => {
        const origin = [{x:1, y:3}, {x:2, y:3},  {x:0, y:2}, {x:6, y:9}, {x:-1, y:0.0002}, {x:7, y:1}];
        const expected = [{x:2, y:3}, {x:10, y:6}, {x:0, y:2}, {x:7, y:1}, {x:11, y:11}, {x: 20, y:0}];
        const patch = {
            delete: [[0, 1], [3, 2]],
            add: [[1, [{x:10, y:6}]], [4, [{x:11, y:11}, {x:20, y:0}]]],
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