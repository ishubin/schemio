onmessage = (event) => {
    importScripts('/assets/katex/katex.min.js');
    const html = katex.renderToString(event.data.expression, {
        throwOnError: false
    });
    postMessage(html);
};
