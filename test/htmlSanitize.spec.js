import htmlSanitize from '../src/htmlSanitize.js';
import expect from 'expect';

describe('htmlSanitize', () => {
    it('should sanitize html', () => {
        const inputHtml = '<blockquote>quote</blockquote> <em>em</em> <i>i</i> <b>bold</b> <strong>strong</strong> <script>alert(1)</script> <img onerr=\"alert(2)\" src=\"http://example.com/img\"/>' ;

        const result = htmlSanitize(inputHtml);

        expect(result).toBe('<blockquote>quote</blockquote> <em>em</em> <i>i</i> <b>bold</b> <strong>strong</strong>  <img src=\"http://example.com/img\" />');
    });
});
