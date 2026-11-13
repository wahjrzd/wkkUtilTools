/** XML formatting runs only in the browser; it never inserts XML into the page. */
export function formatXml(input) {
  const text = input.trim();
  if (!text) throw new Error('请先粘贴 XML 内容。');
  if (text.length > 2_000_000) throw new Error('内容超过限制，请缩小后再试。');
  const document = new DOMParser().parseFromString(text, 'application/xml');
  const error = [...document.getElementsByTagNameNS('*', 'parsererror')].find(node =>
    node.namespaceURI === 'http://www.mozilla.org/newlayout/xml/parsererror.xml' ||
    (node.namespaceURI === 'http://www.w3.org/1999/xhtml' && node.textContent.includes('This page contains the following errors:'))
  );
  if (error) {
    const location = /line (\d+) at column (\d+)/i.exec(error.textContent);
    throw new Error(location ? `XML 格式有误：第 ${location[1]} 行，第 ${location[2]} 列。请检查标签、属性与实体。` : 'XML 格式有误，请检查标签闭合、属性引号与实体。');
  }
  // Serializing a parsed DTD can lose its internal subset. Preserve input by refusing it.
  if (document.doctype) throw new Error('暂不支持含 DOCTYPE / DTD 的 XML，原文已保留。');
  let addedSize = 0;
  function indent(element, depth = 0) {
    if (depth > 256) throw new Error('XML 嵌套层级过深，请减少后再试。');
    const nodes = [...element.childNodes];
    const preserve = element.getAttributeNS('http://www.w3.org/XML/1998/namespace', 'space') === 'preserve';
    const mixed = nodes.some(node => node.nodeType === 4 || (node.nodeType === 3 && /\S/.test(node.nodeValue)));
    const structural = nodes.some(node => [1, 7, 8].includes(node.nodeType));
    if (preserve || mixed || !structural) return;
    const children = nodes.filter(node => node.nodeType !== 3);
    for (const child of children) if (child.nodeType === 1) indent(child, depth + 1);
    const before = '\r\n' + '\t'.repeat(depth + 1);
    const after = '\r\n' + '\t'.repeat(depth);
    addedSize += before.length * children.length + after.length;
    if (text.length + addedSize > 8_000_000) throw new Error('格式化结果过大，请减少内容或嵌套层级。');
    element.replaceChildren();
    for (const child of children) element.append(document.createTextNode(before), child);
    element.append(document.createTextNode(after));
  }
  indent(document.documentElement);
  const serializer = new XMLSerializer();
  const declaration = /^<\?xml\s[\s\S]*?\?>/.exec(text)?.[0];
  const result = [declaration, ...[...document.childNodes].map(node => serializer.serializeToString(node))].filter(Boolean).join('\r\n');
  if (result.length > 8_000_000) throw new Error('格式化结果过大，请减少内容后再试。');
  return result;
}
