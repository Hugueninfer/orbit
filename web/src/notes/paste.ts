import { Fragment, Slice, type Node as PMNode } from "@tiptap/pm/model";
const sizes = [12, 14, 16, 18, 20, 24, 28, 32, 40];
function color(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  if (/^#[\da-f]{6}$/i.test(value)) return value;
  if (/^#[\da-f]{3}$/i.test(value))
    return (
      "#" +
      value
        .slice(1)
        .split("")
        .map((x) => x + x)
        .join("")
    );
  const rgb = value.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  if (rgb)
    return (
      "#" +
      rgb
        .slice(1)
        .map((x) => Math.min(255, Number(x)).toString(16).padStart(2, "0"))
        .join("")
    );
  return (
    (
      {
        red: "#ff0000",
        blue: "#0000ff",
        green: "#008000",
        black: "#000000",
        white: "#ffffff",
        yellow: "#ffff00",
      } as Record<string, string>
    )[value.toLowerCase()] ?? null
  );
}
export function normalizeStyle(attrs: Record<string, unknown>) {
  const px =
    typeof attrs.fontSize === "string" && /^\d+(\.\d+)?px$/.test(attrs.fontSize)
      ? parseFloat(attrs.fontSize)
      : 0;
  return {
    color: color(attrs.color),
    backgroundColor: color(attrs.backgroundColor),
    fontSize: px
      ? sizes.reduce((a, b) => (Math.abs(b - px) < Math.abs(a - px) ? b : a)) +
        "px"
      : null,
    fontFamily: ["Geist", "Georgia", "monospace"].includes(
      String(attrs.fontFamily),
    )
      ? attrs.fontFamily
      : null,
    lineHeight: ["1", "1.5", "2"].includes(String(attrs.lineHeight))
      ? attrs.lineHeight
      : null,
  };
}
/** Normalize clipboard marks once, keeping the editor and persisted document identical. */
export function normalizePaste(slice: Slice): Slice {
  const map = (node: PMNode): PMNode => {
    const children: PMNode[] = [];
    node.content.forEach((child) => children.push(map(child)));
    const marks = node.marks.flatMap((mark) => {
      if (mark.type.name === "textStyle")
        return [mark.type.create(normalizeStyle(mark.attrs))];
      if (mark.type.name === "highlight")
        return [mark.type.create({ color: color(mark.attrs.color) })];
      if (mark.type.name === "link") {
        const href = mark.attrs.href;
        if (
          typeof href !== "string" ||
          href.length > 2000 ||
          !/^(https?:\/\/|mailto:)[^\s\x00-\x20]+$/i.test(href)
        )
          return [];
        return [
          mark.type.create({
            href,
            target: "_blank",
            rel: "noopener noreferrer nofollow",
            class: null,
            title:
              typeof mark.attrs.title === "string"
                ? mark.attrs.title.slice(0, 200)
                : null,
          }),
        ];
      }
      return [mark];
    });
    return (node.isText ? node : node.copy(Fragment.from(children))).mark(
      marks,
    );
  };
  const nodes: PMNode[] = [];
  slice.content.forEach((node) => nodes.push(map(node)));
  return new Slice(Fragment.from(nodes), slice.openStart, slice.openEnd);
}
