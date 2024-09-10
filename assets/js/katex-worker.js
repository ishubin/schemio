onmessage = (event) => {
    const routePrefix = event.data.routePrefix ? event.data.routePrefix : '';

    importScripts(`${routePrefix}/assets/katex/katex.min.js`);
    const html = katex.renderToString(event.data.expression, {
        throwOnError: false
    });
    postMessage(html);
};
