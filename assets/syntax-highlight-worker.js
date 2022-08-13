onmessage = (event) => {
    importScripts('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.6.0/highlight.min.js');
    const result = self.hljs.highlight(event.data.text, {language: event.data.lang});
    postMessage(result.value);
};