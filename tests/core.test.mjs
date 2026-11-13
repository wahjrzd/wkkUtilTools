import test from 'node:test';
import assert from 'node:assert/strict';
import { formatJson, unixToLocal, localToUnix, formatLocal } from '../public/core.js';

test('formats nested JSON with tabs and CRLF, including empty containers', () => {
  assert.equal(formatJson('{"a":[1,{"b":true}],"empty":{}}'), '{\r\n\t"a": [\r\n\t\t1,\r\n\t\t{\r\n\t\t\t"b": true\r\n\t\t}\r\n\t],\r\n\t"empty": {}\r\n}');
});
test('preserves numbers, duplicate keys and string escape spelling', () => {
  const source = '{"id":900719925474099312345,"id":1e400,"s":"a\\r\\n\\t\\\"{}", "z":-0}';
  const result = formatJson(source);
  assert.ok(result.includes('900719925474099312345'));
  assert.ok(result.includes('1e400'));
  assert.ok(result.includes('"a\\r\\n\\t\\\"{}"'));
  assert.ok(result.includes('"z": -0'));
  assert.equal((result.match(/"id"/g) ?? []).length, 2);
  assert.equal(formatJson(result), result);
});
test('accepts JSON primitives and empty arrays', () => {
  for (const value of ['null', 'true', '123', '"hello"', '[]', '{}']) assert.equal(formatJson(value), value);
});
test('rejects blank and malformed JSON without silently repairing it', () => {
  for (const source of ['', '{"a":}', '[1,]', '{a:1}', '{"a":1} trailing']) assert.throws(() => formatJson(source));
});
test('rejects formatting that expands a small input beyond the editor size budget', () => {
  const source = '['.repeat(128) + Array(70000).fill('0').join(',') + ']'.repeat(128);
  assert.throws(() => formatJson(source), /过大/);
});
test('seconds and milliseconds represent the same instant', () => {
  const seconds = unixToLocal('1794362400');
  const millis = unixToLocal('1794362400000');
  assert.equal(seconds.unit, '秒');
  assert.equal(millis.unit, '毫秒');
  assert.equal(seconds.value, millis.value);
  assert.equal(localToUnix(seconds.value), '1794362400');
  assert.equal(unixToLocal('1794362400123').value, seconds.value + '.123');
});
test('handles zero and negative Unix timestamps', () => {
  assert.equal(localToUnix(unixToLocal('0').value), '0');
  assert.equal(localToUnix(unixToLocal('-1234567890').value), '-1234567890');
});
test('rejects malformed, empty and out-of-range timestamps', () => {
  for (const value of ['', '999999999999999999', 'NaN', '1794362400oops', '0000000000']) assert.throws(() => unixToLocal(value));
});
test('strictly validates local dates and leap days', () => {
  for (const value of ['', '2026-02-29 10:00:00', '2026-04-31 10:00:00', '2026-11-11 25:00:00', '2026-13-01 00:00:00', '11/11/2026', '2026-11-11T10:00:00Z']) assert.throws(() => localToUnix(value));
  assert.match(localToUnix('2024-02-29 00:00:00'), /^-?\d+$/);
});
test('accepts fractional local seconds without dropping milliseconds', () => {
  const base = Number(localToUnix('2026-11-10 16:46:19'));
  for (const [fraction, milliseconds] of [['766', 766], ['7', 700], ['07', 70], ['000', 0]]) {
    const result = localToUnix(`2026-11-10 16:46:19.${fraction}`);
    assert.equal(Number(result), base * 1000 + milliseconds);
  }
  if (process.env.TZ === 'Asia/Singapore') assert.equal(localToUnix('2026-11-10 16:46:19.766'), '1794300379766');
  for (const value of ['2026-11-10 16:46:19.', '2026-11-10 16:46:19.1234', '2026-02-30 16:46:19.766']) assert.throws(() => localToUnix(value));
});
test('fractional Unix seconds can be converted back, without confusing them with milliseconds', () => {
  assert.equal(unixToLocal('1794300379.766').value, unixToLocal('1794300379766').value);
  assert.equal(unixToLocal('1794300379.766').unit, '秒');
  assert.throws(() => unixToLocal('1794300379766.7'));
});
test('formatLocal uses the runtime timezone', () => {
  const date = new Date(1794362400000);
  assert.equal(formatLocal(date).slice(11, 13), String(date.getHours()).padStart(2, '0'));
  if (process.env.TZ === 'Asia/Singapore') assert.equal(formatLocal(date), '2026-11-11 10:00:00');
  if (process.env.TZ === 'UTC') assert.equal(formatLocal(date), '2026-11-11 02:00:00');
});
test('rejects nonexistent or ambiguous daylight-saving local time', { skip: process.env.TZ !== 'America/New_York' }, () => {
  assert.throws(() => localToUnix('2026-03-08 02:30:00'), /不存在|夏令时/);
  assert.throws(() => localToUnix('2026-11-01 01:30:00'), /重复|夏令时/);
});


test('defaults fewer than 13 integer digits to seconds and permits manual units', () => {
  for (const value of ['123', '17943624000', '179436240000', '-17943624000', '1.5']) assert.equal(unixToLocal(value).unit, '秒');
  assert.equal(unixToLocal('1794362400000').unit, '毫秒');
  assert.equal(unixToLocal('17943624000000').unit, '毫秒');
  assert.equal(unixToLocal('17943624000', 'ms').unit, '毫秒');
  assert.equal(unixToLocal('1794362400000', 's').unit, '秒');
  assert.equal(unixToLocal('100000000000', 'ms').value, unixToLocal('100000000').value);
  assert.throws(() => unixToLocal('1.5', 'ms'));
  assert.throws(() => unixToLocal('1000', 'minutes'));
});
