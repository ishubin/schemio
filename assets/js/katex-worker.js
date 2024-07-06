onmessage = (event) => {
    importScripts('/assets/katex/katex.min.js');
    const html = katex.renderToString(event.data.formula, {
        throwOnError: false
    });
    postMessage(html);
};
