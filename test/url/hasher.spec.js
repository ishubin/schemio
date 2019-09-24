import hasher from '../../src/ui/url/hasher.js';
import expect from 'expect';


describe('hasher', () => {
    it('should encode page params for url hash', () => {
        const params = {
            page: 1,
            name: 'Hello world;!',
            style: 'position: absolute'
        };

        const result = hasher.encodeURLHash(params);

        expect(result).toBe('page:1;name:Hello%20world%3B!;style:position%3A%20absolute')
    });

    it('should decode page params from url hash', () => {
        const result = hasher.decodeURLHash('page:1;name:Hello%20world%3B!;style:position%3A%20absolute');

        expect(result).toStrictEqual({
            page: '1',
            name: 'Hello world;!',
            style: 'position: absolute'
        });
    });
});
