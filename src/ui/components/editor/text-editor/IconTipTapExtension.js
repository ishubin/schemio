import { Node, mergeAttributes } from "@tiptap/core";

export default Node.create({
    name: "icon",
    group: 'inline',
    draggable: true,
    selectable: true,

    inline() {
        return true;
    },

    addAttributes() {
        return {
            class: {
                default: '',
                parseHTML: (element) => {
                    return element.getAttribute("class");
                }
            },
        };
    },

    parseHTML() {
        return [{ tag: "span[class]" }];
    },

    renderHTML({ HTMLAttributes, node }) {
        return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
    },
});