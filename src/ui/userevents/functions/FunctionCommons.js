
const INTERVAL_MS = 10;
export function waitForItemAnimationContainer(itemId, callback, timeoutMs = 500) {
    const domId = `animation-container-${itemId}`;
    let el = document.getElementById(domId);
    if (el) {
        callback(el);
        return;
    } else {
        const startTime = performance.now();

        const intervalId = setInterval(() => {
            const endTime = performance.now();
            if (endTime - startTime > timeoutMs) {
                clearInterval(intervalId);
                callback(null);
            }
            el = document.getElementById(domId);
            if (el) {
                clearInterval(intervalId);
                callback(el);
            }
        }, INTERVAL_MS);
    }
}