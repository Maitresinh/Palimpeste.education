/**
 * Copies text to the clipboard with a fallback mechanism for older browsers
 * or contexts where navigator.clipboard is unavailable (e.g. non-HTTPS).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    // Try the modern Clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.warn("Clipboard API failed, falling back to legacy command", err);
        }
    }

    // Fallback to document.execCommand('copy')
    try {
        const textArea = document.createElement("textarea");
        textArea.value = text;

        // Ensure the textarea is not visible but part of the DOM
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);

        textArea.focus();
        textArea.select();

        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);

        return successful;
    } catch (err) {
        console.error("Fallback copy method failed", err);
        return false;
    }
}
