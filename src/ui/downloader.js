export function downloadContent(fileName, mimeType, content) {
    fileName = fileName.replace(/[^a-zA-Z0-9\-\_\.]/g, '-').replace(/\s/g, '-');
    const dataUrl = `data:${mimeType};base64,${btoa(content)}`;

    const link = document.createElement('a');
    document.body.appendChild(link);

    try {
        link.href = dataUrl;
        link.download = fileName;
        link.click();
    } catch(e) {
        console.error(e);
    }
    setTimeout(() => document.body.removeChild(link), 100);
}