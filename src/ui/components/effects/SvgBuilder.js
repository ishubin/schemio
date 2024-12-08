export function svgElement(name, attrs, childElements) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', name);
    if (attrs) {
        for (let attrName in attrs) {
            if (attrs.hasOwnProperty(attrName)) {
                el.setAttribute(attrName, attrs[attrName]);
            }
        }
    }

    if (Array.isArray(childElements)) {
        for (let i = 0; i < childElements.length; i++) {
            el.appendChild(childElements[i]);
        }
    }
    return el;
}
