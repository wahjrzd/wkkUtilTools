/** Format original tokens, rather than reserializing parsed numbers or keys. */
export function formatJson(input) {
  const text = input.trim();
  if (!text) throw new Error('请先粘贴 JSON 内容。');
  if (text.length > 2_000_000) throw new Error('内容超过 2 MB，请缩小后再试。');
  try { JSON.parse(text); } catch (error) {
    const position = /position (\d+)/i.exec(error.message);
    const prefix = position ? text.slice(0, Number(position[1])) : '';
    const line = prefix.split('\n').length;
    const column = prefix.length - prefix.lastIndexOf('\n');
    throw new Error(position ? `JSON 格式有误：第 ${line} 行，第 ${column} 列。请检查引号、逗号与括号。` : 'JSON 格式有误，请检查引号、逗号与括号是否完整。');
  }
  const tokens = text.match(/"(?:\\[\s\S]|[^"\\])*"|[{}\[\],:]|[^\s{}\[\],:]+/g);
  const output = [];
  let outputLength = 0;
  const write = (...parts) => {
    outputLength += parts.reduce((total, part) => total + part.length, 0);
    if (outputLength > 8_000_000) throw new Error('格式化结果过大，请减少内容或嵌套层级。');
    output.push(...parts);
  };
  let depth = 0;
  const newline = () => write('\r\n', '\t'.repeat(depth));
  tokens.forEach((token, i) => {
    if (token === '{' || token === '[') {
      write(token);
      if (tokens[i + 1] !== (token === '{' ? '}' : ']')) { depth++; newline(); }
    } else if (token === '}' || token === ']') {
      if (tokens[i - 1] !== (token === '}' ? '{' : '[')) { depth--; newline(); }
      write(token);
    } else if (token === ',') { write(','); newline(); }
    else if (token === ':') write(': ');
    else write(token);
  });
  return output.join('');
}

const pad = (number, length = 2) => String(number).padStart(length, '0');
export function formatLocal(date) {
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function unixToLocal(input, unit = 'auto') {
  const text = input.trim();
  if (!text) throw new Error('请输入 Unix 时间戳。');
  const match = /^(-?)(0|[1-9]\d*)(?:\.(\d{1,3}))?$/.exec(text);
  if (!match) throw new Error('请输入有效时间戳，秒最多保留三位小数，不支持前导零。');
  const length = match[2].length;
  if (!['auto', 's', 'ms'].includes(unit)) throw new Error('请选择秒或毫秒。');
  const isMillis = unit === 'auto' ? length >= 13 : unit === 'ms';
  if (isMillis && match[3]) throw new Error('毫秒时间戳须为整数。');
  const milliseconds = isMillis ? Number(match[2]) : Number(match[2]) * 1000 + Number((match[3] || '').padEnd(3, '0'));
  const date = new Date(milliseconds * (match[1] ? -1 : 1));
  if (!Number.isFinite(date.getTime())) throw new Error('时间戳超出支持范围。');
  const fraction = date.getMilliseconds();
  return { value: formatLocal(date) + (fraction ? `.${pad(fraction, 3)}` : ''), unit: isMillis ? '毫秒' : '秒' };
}

export function localToUnix(input) {
  const text = input.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/.exec(text);
  if (!match) throw new Error('请输入 YYYY-MM-DD HH:mm:ss，可附加 1–3 位毫秒小数。');
  const [, year, month, day, hour, minute, second] = match.map(Number);
  const milliseconds = Number((match[7] || '').padEnd(3, '0'));
  const baseText = text.slice(0, 19);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(hour, minute, second, milliseconds);
  if (formatLocal(date) !== baseText) throw new Error('日期时间不存在，请检查日期、时间或系统时区的夏令时。');
  // Detect repeated wall-clock time across offset transitions, including half-hour DST.
  const offsets = new Set([-2, -1, 1, 2].map(days => new Date(date.getTime() + days * 86400000).getTimezoneOffset()));
  for (const offset of offsets) {
    const candidate = new Date(date.getTime() + (offset - date.getTimezoneOffset()) * 60000);
    if (candidate.getTime() !== date.getTime() && formatLocal(candidate) === baseText) {
      throw new Error('该时间因夏令时切换重复，无法唯一确定 Unix 时间戳。');
    }
  }
  return String(match[7] !== undefined ? date.getTime() : date.getTime() / 1000);
}
