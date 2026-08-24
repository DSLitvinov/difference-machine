import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import go from "highlight.js/lib/languages/go";
import ini from "highlight.js/lib/languages/ini";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import { fileExtension } from "@/lib/file-kind";

export type SyntaxSpan = {
  text: string;
  className?: string;
};

const EXT_LANG: Record<string, string> = {
  md: "markdown",
  markdown: "markdown",
  json: "json",
  html: "xml",
  htm: "xml",
  svg: "xml",
  xml: "xml",
  css: "css",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  go: "go",
  rs: "rust",
  yml: "yaml",
  yaml: "yaml",
  toml: "ini",
  ini: "ini",
  cfg: "ini",
  sh: "bash",
  bash: "bash",
};

let registered = false;

function registerLanguages() {
  if (registered) {
    return;
  }
  hljs.registerLanguage("bash", bash);
  hljs.registerLanguage("css", css);
  hljs.registerLanguage("go", go);
  hljs.registerLanguage("ini", ini);
  hljs.registerLanguage("javascript", javascript);
  hljs.registerLanguage("json", json);
  hljs.registerLanguage("markdown", markdown);
  hljs.registerLanguage("python", python);
  hljs.registerLanguage("rust", rust);
  hljs.registerLanguage("typescript", typescript);
  hljs.registerLanguage("xml", xml);
  hljs.registerLanguage("yaml", yaml);
  registered = true;
}

export function highlightLanguage(fileName: string): string | undefined {
  return EXT_LANG[fileExtension(fileName)];
}

export function highlightLines(text: string, fileName: string): SyntaxSpan[][] {
  if (text.length === 0) {
    return [[]];
  }
  const language = highlightLanguage(fileName);
  if (!language) {
    return text.split("\n").map((line) => (line ? [{ text: line }] : []));
  }
  registerLanguages();
  try {
    const html = hljs.highlight(text, { language, ignoreIllegals: true }).value;
    return htmlToLines(html);
  } catch {
    return text.split("\n").map((line) => (line ? [{ text: line }] : []));
  }
}

function htmlToLines(html: string): SyntaxSpan[][] {
  const lines: SyntaxSpan[][] = [[]];
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) {
    return [[]];
  }
  walk(root, "", lines);
  return lines;
}

function walk(node: Node, className: string, lines: SyntaxSpan[][]) {
  if (node.nodeType === Node.TEXT_NODE) {
    const parts = (node.textContent ?? "").split("\n");
    parts.forEach((part, index) => {
      if (index > 0) {
        lines.push([]);
      }
      if (part) {
        lines[lines.length - 1].push(className ? { text: part, className } : { text: part });
      }
    });
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return;
  }
  const next = [className, (node as Element).getAttribute("class") ?? ""].filter(Boolean).join(" ");
  node.childNodes.forEach((child) => walk(child, next, lines));
}
