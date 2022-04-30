import { applyPatch, applyStringPatch, generatePatchStatistic, generateSchemePatch, generateStringPatch, stringLCS } from '../src/ui/scheme/SchemePatch'
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

describe('SchemePatch.applyPatch', () => {
    forEach(patchTestData, testData => {
        it(`should apply patch with ${testData.name}`, () => {
            const modifiedObject = applyPatch(testData.origin, testData.patch);
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