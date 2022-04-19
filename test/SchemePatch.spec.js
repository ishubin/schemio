import { applyPatch, generateSchemePatch } from '../src/ui/scheme/SchemePatch'
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