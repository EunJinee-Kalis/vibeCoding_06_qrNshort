const urlInput = document.getElementById('url-input');
const generateBtn = document.getElementById('generate-btn');
const inputArea = document.getElementById('input-area');
const qrArea = document.getElementById('qr-area');
const qrBox = document.getElementById('qrcode');
const qrUrl = document.getElementById('qr-url');

// 주소 앞에 http(s)가 없으면 https:// 를 붙여 준다
function normalizeUrl(value) {
  const v = value.trim();
  if (!v) return '';
  return /^https?:\/\//i.test(v) ? v : 'https://' + v;
}

function generateQR() {
  const url = normalizeUrl(urlInput.value);
  if (!url) {
    alert('URL을 입력해 주세요.');
    urlInput.focus();
    return;
  }
  if (typeof QRCode === 'undefined') {
    alert('QR코드 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.');
    return;
  }

  qrBox.innerHTML = '';
  new QRCode(qrBox, {
    text: url,
    width: 260,
    height: 260,
    colorDark: '#222222',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H
  });
  qrUrl.textContent = url;

  // 입력창은 아래로, QR코드는 정중앙에
  inputArea.classList.replace('center', 'bottom');
  qrArea.classList.remove('hidden');
}

generateBtn.addEventListener('click', generateQR);
urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') generateQR();
});

// QR코드를 클릭하면 흰 여백을 둔 JPG로 다운로드
qrBox.addEventListener('click', () => {
  const src = qrBox.querySelector('canvas');
  if (!src) return;
  const pad = 24;
  const out = document.createElement('canvas');
  out.width = src.width + pad * 2;
  out.height = src.height + pad * 2;
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(src, pad, pad);

  const a = document.createElement('a');
  a.href = out.toDataURL('image/jpeg', 0.95);
  a.download = 'qrcode.jpg';
  document.body.appendChild(a);
  a.click();
  a.remove();
});

// 마우스 위치에 따라 그라데이션 색이 조금씩 바뀐다
document.addEventListener('mousemove', (e) => {
  document.body.style.setProperty('--mx', (e.clientX / window.innerWidth * 100).toFixed(1) + '%');
  document.body.style.setProperty('--my', (e.clientY / window.innerHeight * 100).toFixed(1) + '%');
});
