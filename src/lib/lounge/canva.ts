export class InvalidCanvaUrlError extends Error {
  constructor() {
    super("Paste a Canva design link, e.g. https://www.canva.com/design/DAF…/view");
    this.name = "InvalidCanvaUrlError";
  }
}

const HOSTS = new Set(["canva.com", "www.canva.com"]);
const ACTIONS = new Set(["view", "watch", "edit"]);

/**
 * Canva frames a design when its view link carries `?embed`, so share, watch
 * and edit links all normalise to the same viewer URL. The share token that
 * follows the design id grants access to the design and is preserved; links
 * that are not Canva designs are rejected rather than framed.
 */
export function canvaEmbedUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new InvalidCanvaUrlError();
  }

  if (url.protocol !== "https:" || !HOSTS.has(url.hostname)) {
    throw new InvalidCanvaUrlError();
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.shift() !== "design") throw new InvalidCanvaUrlError();

  const last = segments[segments.length - 1];
  if (last && ACTIONS.has(last)) segments.pop();
  if (segments.length === 0 || segments.length > 2) throw new InvalidCanvaUrlError();

  return `https://www.canva.com/design/${segments.join("/")}/view?embed`;
}
