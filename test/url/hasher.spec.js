import { createHasher } from '../../src/ui/url/hasher.js';
import expect from 'expect';


describe('hasher', () => {
    it('should encode page params for url hash in history mode', () => {
        const params = {
            page: 1,
            name: 'Hello world;!',
            style: 'position: absolute'
        };

        const result = createHasher('history').encodeURLHash(params);

        expect(result).toBe('page=1&name=Hello%20world%3B!&style=position%3A%20absolute')
    });

    it('should decode page params from url hash in history mode', () => {
        const result = createHasher('history').decodeURLHash('#page=1&name=Hello%20world%3B!&style=position%3A%20absolute');

        expect(result).toStrictEqual({
            page: '1',
            name: 'Hello world;!',
            style: 'position: absolute'
        });
    });

    it('should encode page params for url hash in hash mode', () => {
        const params = {
            page: 1,
            name: 'Hello world;!',
            style: 'position: absolute'
        };

        const result = createHasher('hash').encodeURLHash(params);

        expect(result).toBe('page=1&name=Hello%20world%3B!&style=position%3A%20absolute')
    });

    it('should decode page params from url hash in hash mode', () => {
        const result = createHasher('hash').decodeURLHash('#/home/?page=1&name=Hello%20world%3B!&style=position%3A%20absolute');

        expect(result).toStrictEqual({
            page: '1',
            name: 'Hello world;!',
            style: 'position: absolute'
        });
    });
});
