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

// is.gd / v.gd 단축 OpenAPI를 JSONP 방식으로 호출
// (일반 fetch는 CORS 보안정책 때문에 GitHub Pages에서 막히므로 JSONP를 사용)
function requestJsonp(baseUrl, longUrl) {
  return new Promise((resolve, reject) => {
    const cbName = 'jsonp_cb_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const script = document.createElement('script');
    const timer = setTimeout(() => { cleanup(); reject(new Error('timeout')); }, 8000);

    function cleanup() {
      clearTimeout(timer);
      delete window[cbName];
      script.remove();
    }

    window[cbName] = (data) => {
      cleanup();
      if (data && data.shorturl) resolve(data.shorturl);
      else reject(new Error((data && data.errormessage) || 'unknown'));
    };
    script.onerror = () => { cleanup(); reject(new Error('network')); };
    script.src = `${baseUrl}?format=json&callback=${cbName}&url=${encodeURIComponent(longUrl)}`;
    document.body.appendChild(script);
  });
}

async function shorten() {
  const longUrl = normalizeUrl(urlInput.value);
  shortenBtn.disabled = true;
  shortenBtn.textContent = '단축 중...';
  showMessage('');
  result.value = '';
  copyBtn.disabled = true;

  try {
    let shortUrl;
    try {
      shortUrl = await requestJsonp('https://is.gd/create.php', longUrl);
    } catch (first) {
      // is.gd가 실패하면 같은 회사의 v.gd로 다시 시도
      shortUrl = await requestJsonp('https://v.gd/create.php', longUrl);
    }
    result.value = shortUrl;
    copyBtn.disabled = false;
    showMessage('단축 URL이 만들어졌습니다.', 'ok');
  } catch (err) {
    showMessage('URL 단축에 실패했습니다. 주소가 올바른지 확인하고 다시 시도해 주세요.', 'error');
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
