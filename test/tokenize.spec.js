import { tokenizeText } from "../src/ui/scheme/tokenize";
import expect from 'expect';



describe('SchemaPatch.tokenizeText', () => {
    it('should break text into array of tokens', () => {
        const tokens = tokenizeText('< p ></p><p>Hello World &gt;</p> &amp; <a href="https://example.com?name=qweqw">User123-qwe</a>');

        expect(tokens).toStrictEqual([ {
            "idx": 0,
            "text": "< p >"
        }, {
            "idx": 5,
            "text": "</p>"
        }, {
            "idx": 9,
            "text": "<p>"
        }, {
            "idx": 12,
            "text": "Hello"
        },{
            "idx": 17,
            "text": " "
        },{
            "idx": 18,
            "text": "World"
        },{
            "idx": 23,
            "text": " "
        },{
            "idx": 24,
            "text": "&gt;"
        },{
            "idx": 28,
            "text": "</p>"
        },{
            "idx": 32,
            "text": " "
        },{
            "idx": 33,
            "text": "&amp;"
        },{
            "idx": 38,
            "text": " "
        },{
            "idx": 39,
            "text": "<a href=\"https://example.com?name=qweqw\">"
        },{
            "idx": 80,
            "text": "User123"
        },{
            "idx": 87,
            "text": "-"
        },{
            "idx": 88,
            "text": "qwe"
        },{
            "idx": 91,
            "text": "</a>"
        } ])
    });
});