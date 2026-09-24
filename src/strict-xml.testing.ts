import { SaxesParser } from "saxes";

export type XmlElement = {
  attributes: Map<string, string>;
  children: XmlElement[];
  localName: string;
  namespace: string;
  text: string;
};

export const ATOM_NS = "http://www.w3.org/2005/Atom";
export const CONTENT_NS = "http://purl.org/rss/1.0/modules/content/";
export const DC_NS = "http://purl.org/dc/elements/1.1/";

/**
 * Parses a complete XML 1.0 document with a conforming, namespace-aware
 * parser and throws on the first well-formedness or namespace error.
 * Attribute keys are `{namespace}local` for namespaced attributes and the
 * bare local name otherwise.
 */
export function parseXmlStrict(xml: string): XmlElement {
  const parser = new SaxesParser({ xmlns: true });
  const stack: XmlElement[] = [];
  let root: XmlElement | undefined;
  let failure: Error | undefined;
  parser.on("error", (error) => {
    failure ??= error;
  });
  parser.on("opentag", (tag) => {
    const attributes = new Map<string, string>();
    for (const attribute of Object.values(tag.attributes)) {
      if (attribute.prefix === "xmlns" || attribute.name === "xmlns") continue;
      const key = attribute.uri === "" ? attribute.local : `{${attribute.uri}}${attribute.local}`;
      attributes.set(key, attribute.value);
    }
    const element: XmlElement = {
      attributes,
      children: [],
      localName: tag.local,
      namespace: tag.uri,
      text: "",
    };
    const parent = stack.at(-1);
    if (parent === undefined) root = element;
    else parent.children.push(element);
    stack.push(element);
  });
  parser.on("text", (text) => {
    const current = stack.at(-1);
    if (current !== undefined) current.text += text;
  });
  parser.on("closetag", () => {
    stack.pop();
  });
  parser.write(xml).close();
  if (failure !== undefined) throw failure;
  if (root === undefined) throw new Error("XML document has no root element.");
  return root;
}

export function children(parent: XmlElement, localName: string, namespace: string): XmlElement[] {
  return parent.children.filter((child) => (
    child.localName === localName && child.namespace === namespace
  ));
}

export function child(parent: XmlElement, localName: string, namespace: string): XmlElement {
  const [match, extra] = children(parent, localName, namespace);
  if (match === undefined || extra !== undefined) {
    throw new Error(`Expected exactly one ${namespace} ${localName} in ${parent.localName}.`);
  }
  return match;
}

export function optionalText(parent: XmlElement, localName: string, namespace: string): string | undefined {
  const matches = children(parent, localName, namespace);
  if (matches.length > 1) {
    throw new Error(`Expected at most one ${namespace} ${localName} in ${parent.localName}.`);
  }
  return matches[0]?.text;
}
