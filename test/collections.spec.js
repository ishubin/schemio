import expect from 'expect';
import collections from '../src/ui/collections.js';

describe('collections.giveUniqueName', () => {
    it("should keep prefix as is in case there are no such items", () => {
        const result = collections.giveUniqueName("rect", ["circle", "square", "triangle"]);
        expect(result).toBe("rect");
    });

    it("should add ' 2' as a suffix in case there is such item already", () => {
        const result = collections.giveUniqueName("rect", ["rect", "rect one", "circle", "square", "triangle"]);
        expect(result).toBe("rect 2");
    });

    it("should add an incrementing index as a suffix if there are names with indices already", () => {
        const result = collections.giveUniqueName("rect", ["rect", "rect one", "rect 8", "rect 2", "rect ", "circle", "square", "triangle"]);
        expect(result).toBe("rect 9");
    });
});