import { parseAST } from "./ast";
import { tokenizeExpression } from "./tokenizer";



class StringPart {
    constructor(text, isExpression) {
        this.text = text;
        this.isExpression = isExpression;
        this.expression = null;
    }

    process(symbol) {
        this.text = this.text + symbol;
    }

    compile() {
        if (this.isExpression) {
            this.expression = parseAST(tokenizeExpression(this.text));
        }
    }

    render(scope) {
        if (this.isExpression) {
            return this.expression.evalNode(scope);
        } else {
            return this.text;
        }
    }
}

class StringTemplate {
    constructor(parts) {
        this.parts = parts;
    }

    compile() {
        this.parts.forEach(part => part.compile());
    }

    render(scope) {
        let text = '';
        this.parts.forEach(part => {
            text = text + part.render(scope);
        });
        return text;
    }
}



class StringExpressionParser {
    constructor(text) {
        this.text = text;
        this.idx = 0;
    }

    parse() {
        let currentPart = new StringPart('', false);
        const parts = [currentPart];
        while(true) {
            const symbol = this.scan();
            if (!symbol) {
                break;
            }
            if (symbol === '$' && this.peekNext() === '{') {
                this.skip();
                currentPart = new StringPart('', true);
                parts.push(currentPart);
            } else if (symbol === '}' && currentPart.isExpression) {
                currentPart = new StringPart('', false);
                parts.push(currentPart);
            } else {
                currentPart.process(symbol);
            }
        }

        const t = new StringTemplate(parts);
        t.compile();
        return t;
    }

    scan() {
        if (this.idx >= this.text.length) {
            return null;
        }
        const sym = this.text[this.idx];
        this.idx++;
        return sym;
    }

    peekNext() {
        if (this.idx >= this.text.length) {
            return null;
        }
        return this.text[this.idx];
    }

    skip() {
        this.idx++;
    }
}
/**
 *
 * @param {String} text
 * @returns {StringTemplate}
 */
export function parseStringExpression(text) {
    return new StringExpressionParser(text).parse();
}