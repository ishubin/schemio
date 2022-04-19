import { generateSchemePatch } from '../src/ui/scheme/SchemePatch'
import expect from 'expect';
import { forEach } from 'lodash';
import { patchTestData } from './data/patch/patch-test-data';


describe('SchemePatch.generateSchemePatch', () => {
    forEach(patchTestData, testData => {
        it(`should recognize ${testData.name}`, () => {
            const patch = generateSchemePatch(testData.origin, testData.modified);
            expect(patch).toStrictEqual(testData.patch)
        });
    });
});