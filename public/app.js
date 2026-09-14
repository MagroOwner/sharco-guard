const el = id => document.getElementById(id);
const button = el('scan');
const cloudMode = location.hostname !== 'localhost' && location.hostname !== '127.0.0.1';

function setMetrics({ files = '—', threats = '—', review = '—' }) {
  el('files').textContent = files;
  el('threats').textContent = threats;
  el('review').textContent = review;
}

function showCloudResult(result) {
  const list = el('list');
  list.replaceChildren();
  const item = document.createElement('div'); item.className = 'finding';
  const badge = document.createElement('span'); badge.className = `badge ${result.verdict === 'malicious' ? 'threat' : 'review'}`;
  badge.textContent = result.verdict === 'malicious' ? 'DETECTED' : 'UNKNOWN';
  const text = document.createElement('div');
  const title = document.createElement('b');
  const detail = document.createElement('p');
  if (result.verdict === 'malicious') {
    title.textContent = result.detection.name;
    detail.textContent = `${result.detection.severity.toUpperCase()} · Recommended action: ${result.detection.action}`;
  } else {
    title.textContent = 'No confirmed threat match';
    detail.textContent = 'This hash is not currently in the Sharco Guard confirmed-threat database.';
  }
  text.append(title, detail); item.append(badge, text); list.append(item);
}

if (cloudMode) {
  document.querySelector('.scan label').textContent = 'File SHA-256 hash';
  document.querySelector('.scan .note').textContent = 'Checks a hash against confirmed threats. The website never uploads or executes a file.';
  document.querySelectorAll('.metric span')[0].textContent = 'HASHES CHECKED';
  document.querySelectorAll('.metric span')[1].textContent = 'THREATS FOUND';
  document.querySelectorAll('.metric span')[2].textContent = 'UNKNOWN HASHES';
  el('status').textContent = 'Threat intelligence lookup';
  el('detail').textContent = 'Paste a file SHA-256 hash to check it against Sharco Guard.';
  el('path').placeholder = '64-character SHA-256 hash';
  el('path').setAttribute('inputmode', 'text');
  button.textContent = 'Check hash';
}
button.addEventListener('click', async () => {
  const path = el('path').value.trim();
  if (!path) { el('detail').textContent = cloudMode ? 'Enter a SHA-256 hash first.' : 'Enter a folder path first.'; return; }
  button.disabled = true; button.textContent = 'Scanning…';
  el('status').textContent = cloudMode ? 'Checking threat intelligence' : 'Scan in progress';
  el('detail').textContent = cloudMode ? 'Comparing this hash with confirmed Sharco Guard detections.' : 'Reviewing local files. Nothing is uploaded.';
  try {
    if (cloudMode) {
      if (!/^[a-fA-F0-9]{64}$/.test(path)) throw new Error('Enter a 64-character SHA-256 hash.');
      button.textContent = 'Checking…'; el('status').textContent = 'Checking threat intelligence';
      el('detail').textContent = 'Comparing this hash with confirmed Sharco Guard detections.';
      const response = await fetch('/api/v1/reputation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sha256: path }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Lookup failed.');
      setMetrics({ files: '1', threats: result.verdict === 'malicious' ? '1' : '0', review: result.verdict === 'unknown' ? '1' : '0' });
      el('status').textContent = result.verdict === 'malicious' ? 'Threat detected' : 'No confirmed match';
      el('detail').textContent = result.verdict === 'malicious' ? 'This hash is a confirmed threat. Do not open the file.' : 'Use the desktop app for deeper local analysis of unknown files.';
      el('time').textContent = 'Cloud reputation lookup'; showCloudResult(result); return;
    }
    const response = await fetch('/api/scan', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({path}) });
    const report = await response.json(); if (!response.ok) throw new Error(report.error);
    const threats = report.findings.filter(x => x.severity === 'threat');
    const review = report.findings.filter(x => x.severity === 'review');
    setMetrics({ files: report.filesScanned.toLocaleString(), threats: threats.length, review: review.length });
    el('status').textContent = threats.length ? 'Threats detected' : 'Scan complete';
    el('detail').textContent = threats.length ? 'Review the threats below before taking action.' : 'No known test signatures were detected.';
    el('time').textContent = `${(report.elapsedMs/1000).toFixed(1)} seconds${report.truncated ? ' · file limit reached' : ''}`;
    el('list').innerHTML = report.findings.length ? report.findings.map(f => `<div class="finding"><span class="badge ${f.severity}">${f.severity.toUpperCase()}</span><div><b>${f.reason}</b><p>${f.file}</p></div></div>`).join('') : '<div class="empty">No threats or review items were found.</div>';
  } catch (error) { el('status').textContent = 'Scan unavailable'; el('detail').textContent = error.message; }
  finally { button.disabled = false; button.textContent = cloudMode ? 'Check hash' : 'Start scan'; }
});
