const urlInput = document.getElementById('url-input');
const shortenBtn = document.getElementById('shorten-btn');
const result = document.getElementById('result');
const copyBtn = document.getElementById('copy-btn');
const message = document.getElementById('message');
const toast = document.getElementById('toast');

// 입력창이 비어 있으면 '단축하기' 버튼 비활성화
urlInput.addEventListener('input', () => {
  shortenBtn.disabled = urlInput.value.trim() === '';
});
urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !shortenBtn.disabled) shorten();
});

function normalizeUrl(value) {
  const v = value.trim();
  return /^https?:\/\//i.test(v) ? v : 'https://' + v;
}

function showMessage(text, type) {
  message.textContent = text;
  message.className = 'message ' + (type || '');
}

// 시간 제한이 있는 fetch
function fetchWithTimeout(url, options = {}, ms = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

// JSONP 방식 호출 (CORS 제한을 받지 않음)
function jsonp(url, ms = 8000) {
  return new Promise((resolve, reject) => {
    const cb = 'cb_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
    const script = document.createElement('script');
    const timer = setTimeout(() => { cleanup(); reject(new Error('timeout')); }, ms);
    function cleanup() { clearTimeout(timer); delete window[cb]; script.remove(); }
    window[cb] = (data) => { cleanup(); resolve(data); };
    script.onerror = () => { cleanup(); reject(new Error('network')); };
    script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cb;
    document.body.appendChild(script);
  });
}

const isShortUrl = (s) => typeof s === 'string' && /^https?:\/\/\S+$/.test(s.trim());

// 여러 무료 URL 단축 OpenAPI를 차례로 시도
const PROVIDERS = [
  {
    name: 'is.gd',
    run: async (u) => {
      const d = await jsonp('https://is.gd/create.php?format=json&url=' + encodeURIComponent(u));
      if (d && d.shorturl) return d.shorturl;
      throw new Error((d && d.errormessage) || 'is.gd 오류');
    }
  },
  {
    name: 'TinyURL',
    run: async (u) => {
      const r = await fetchWithTimeout('https://tinyurl.com/api-create.php?url=' + encodeURIComponent(u));
      const t = (await r.text()).trim();
      if (r.ok && isShortUrl(t)) return t;
      throw new Error('TinyURL 오류');
    }
  },
  {
    name: 'da.gd',
    run: async (u) => {
      const r = await fetchWithTimeout('https://da.gd/s?url=' + encodeURIComponent(u));
      const t = (await r.text()).trim();
      if (r.ok && isShortUrl(t)) return t;
      throw new Error('da.gd 오류');
    }
  },
  {
    name: 'v.gd',
    run: async (u) => {
      const d = await jsonp('https://v.gd/create.php?format=json&url=' + encodeURIComponent(u));
      if (d && d.shorturl) return d.shorturl;
      throw new Error((d && d.errormessage) || 'v.gd 오류');
    }
  }
];

async function shorten() {
  const longUrl = normalizeUrl(urlInput.value);
  shortenBtn.disabled = true;
  shortenBtn.textContent = '단축 중...';
  showMessage('');
  result.value = '';
  copyBtn.disabled = true;

  const failed = [];
  try {
    for (const p of PROVIDERS) {
      try {
        const shortUrl = await p.run(longUrl);
        result.value = shortUrl;
        copyBtn.disabled = false;
        showMessage(`단축 URL이 만들어졌습니다. (${p.name})`, 'ok');
        return;
      } catch (err) {
        failed.push(p.name);
        console.warn(p.name, '실패:', err);
      }
    }
    showMessage('URL 단축에 실패했습니다. (시도한 서비스: ' + failed.join(', ') +
      ') 네트워크에서 단축 서비스가 차단되었을 수 있습니다.', 'error');
  } finally {
    shortenBtn.textContent = '단축하기';
    shortenBtn.disabled = urlInput.value.trim() === '';
  }
}
shortenBtn.addEventListener('click', shorten);

// '복사' 버튼: 클립보드에 복사하고 알림 표시
copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(result.value);
  } catch (e) {
    result.select();
    document.execCommand('copy');
  }
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
});
