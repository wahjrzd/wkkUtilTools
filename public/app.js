import { formatXml } from './xml.js';
import { formatJson, unixToLocal, localToUnix, formatLocal } from './core.js';

const $ = id => document.getElementById(id);
document.querySelector('.skip-link').addEventListener('click', event => {
  event.preventDefault();
  $('workspace').focus();
});
function status(id, text = '', isError = false) {
  $(id).textContent = text;
  $(id).classList.toggle('error', isError);
}
function navigate() {
  const page = ['json', 'time', 'xml'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'json';
  for (const tool of ['json', 'time', 'xml']) $(`${tool}-panel`).hidden = tool !== page;
  document.querySelectorAll('.nav-item').forEach(link => {
    if (link.hash === `#${page}`) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  const title = { json: 'JSON 格式化', xml: 'XML 格式化', time: '时间戳转换' }[page];
  document.title = `${title} · wkk.tools`;
}
window.addEventListener('hashchange', navigate);
navigate();

function setupEditor(tool, formatter) {
  let lineCount = 1;
  function paintLineNumbers() {
    const input = $(`${tool}-input`);
    if (!input.clientHeight) return;
    const lineHeight = parseFloat(getComputedStyle(input).lineHeight);
    const first = Math.max(0, Math.floor(input.scrollTop / lineHeight) - 1);
    const last = Math.min(lineCount, first + Math.ceil(input.clientHeight / lineHeight) + 3);
    $(`${tool}-line-numbers`).textContent = Array.from({ length: Math.max(0, last - first) }, (_, i) => String(first + i + 1)).join('\n');
    $(`${tool}-line-numbers`).style.transform = `translateY(${first * lineHeight - input.scrollTop}px)`;
  }
  function updateLineNumbers() {
    lineCount = $(`${tool}-input`).value.split('\n').length;
    $(`${tool}-input`).closest('.json-editor').style.setProperty('--gutter-width', `${Math.max(58, String(lineCount).length * 11 + 24)}px`);
    paintLineNumbers();
  }
  $(`${tool}-input`).addEventListener('input', updateLineNumbers);
  $(`${tool}-input`).addEventListener('scroll', paintLineNumbers);
  new ResizeObserver(paintLineNumbers).observe($(`${tool}-input`));
  updateLineNumbers();

  $(`${tool}-form`).addEventListener('submit', event => {
    event.preventDefault();
    try {
      $(`${tool}-input`).value = formatter($(`${tool}-input`).value);
      $(`${tool}-input`).removeAttribute('aria-invalid');
      status(`${tool}-status`);
    } catch (error) {
      $(`${tool}-input`).setAttribute('aria-invalid', 'true');
      status(`${tool}-status`, error.message, true);
    }
    updateLineNumbers();
  });
  $(`${tool}-input`).addEventListener('input', () => { status(`${tool}-status`); $(`${tool}-input`).removeAttribute('aria-invalid'); });
  $(`${tool}-input`).addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); $(`${tool}-form`).requestSubmit(); }
  });

}
setupEditor('json', formatJson);
setupEditor('xml', formatXml);

const copyTimers = new WeakMap();
function setResult(id, value) {
  $(id).value = value;
  const button = document.querySelector(`[data-copy-target="${id}"]`);
  clearTimeout(copyTimers.get(button));
  button.disabled = !value;
  delete button.dataset.copied;
  button.title = '复制结果';
}
document.querySelectorAll('.copy-button').forEach(button => {
  button.addEventListener('click', async () => {
    const input = $(button.dataset.copyTarget);
    const value = input.value;
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      if (input.value !== value) return;
      clearTimeout(copyTimers.get(button));
      button.dataset.copied = 'true';
      button.title = '已复制';
      status(button.dataset.status);
      copyTimers.set(button, setTimeout(() => {
        delete button.dataset.copied;
        button.title = '复制结果';
      }, 1500));
    } catch {
      if (input.value !== value) return;
      clearTimeout(copyTimers.get(button));
      delete button.dataset.copied;
      button.title = '复制结果';
      status(button.dataset.status, '复制失败，请选中结果后按 Ctrl/Cmd+C。', true);
    }
  });
});
function updateUnixUnit() {
  const integer = $('unix-input').value.trim().replace(/^-/, '').split('.')[0];
  $('unix-unit').value = /^\d{13,}$/.test(integer) ? 'ms' : 's';
}
$('unix-unit').addEventListener('change', () => {
  setResult('date-output', '');
  $('unix-input').removeAttribute('aria-invalid');
  status('unix-status');
});

$('unix-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    const result = unixToLocal($('unix-input').value, $('unix-unit').value);
    setResult('date-output', result.value);
    $('unix-input').removeAttribute('aria-invalid');
    status('unix-status');
  } catch (error) {
    setResult('date-output', '');
    $('unix-input').setAttribute('aria-invalid', 'true');
    status('unix-status', error.message, true);
  }
});
$('unix-input').addEventListener('input', () => {
  setResult('date-output', '');
  updateUnixUnit();
  $('unix-input').removeAttribute('aria-invalid');
  status('unix-status');
});
function updateDateUnit() {
  let unit = '—';
  try {
    localToUnix($('date-input').value);
    unit = /\.\d{1,3}$/.test($('date-input').value.trim()) ? '毫秒(ms)' : '秒(s)';
  } catch { /* Invalid or incomplete input has no determined output unit. */ }
  $('date-output-unit').textContent = unit;
  $('unix-output').setAttribute('aria-label', `Unix 时间戳结果（${unit}）`);
}
$('date-form').addEventListener('submit', event => {
  event.preventDefault();
  updateDateUnit();
  try {
    setResult('unix-output', localToUnix($('date-input').value));
    $('date-input').removeAttribute('aria-invalid');
    status('date-status');
  } catch (error) {
    setResult('unix-output', '');
    $('date-input').setAttribute('aria-invalid', 'true');
    status('date-status', error.message, true);
  }
});
$('date-input').addEventListener('input', () => {
  setResult('unix-output', '');
  updateDateUnit();
  $('date-input').removeAttribute('aria-invalid');
  status('date-status');
});

function tick() {
  const now = new Date();
  $('live-date').textContent = formatLocal(now);
  $('live-date').dateTime = now.toISOString();
  $('live-weekday').textContent = now.toLocaleDateString('zh-CN', { weekday: 'long' });
  $('live-unix').textContent = Math.floor(now.getTime() / 1000);
  const offset = -now.getTimezoneOffset();
  const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
  const minutes = String(Math.abs(offset) % 60).padStart(2, '0');
  const zone = `UTC${offset >= 0 ? '+' : '-'}${hours}:${minutes}`;
  $('system-zone').textContent = `系统时区：${zone}`;
  document.querySelectorAll('.system-zone-value').forEach(element => {
    element.textContent = zone;
  });
}
const initial = new Date();
$('unix-input').value = Math.floor(initial.getTime() / 1000);
$('date-input').value = formatLocal(initial);
updateDateUnit();
updateUnixUnit();
tick();
setInterval(tick, 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
