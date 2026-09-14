const el = id => document.getElementById(id);
const button = el('scan');
const cloudMode = location.hostname !== 'localhost' && location.hostname !== '127.0.0.1';
if (cloudMode) {
  el('status').textContent = 'Desktop agent required';
  el('detail').textContent = 'This cloud dashboard will securely connect to Sharco Guard on your device.';
  el('path').placeholder = 'Install the Sharco Guard desktop agent to scan';
  el('path').disabled = true;
  button.disabled = true;
  button.textContent = 'Agent coming soon';
}
button.addEventListener('click', async () => {
  const path = el('path').value.trim();
  if (!path) { el('detail').textContent = 'Enter a folder path first.'; return; }
  button.disabled = true; button.textContent = 'Scanning…';
  el('status').textContent = 'Scan in progress'; el('detail').textContent = 'Reviewing local files. Nothing is uploaded.';
  try {
    const response = await fetch('/api/scan', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({path}) });
    const report = await response.json(); if (!response.ok) throw new Error(report.error);
    const threats = report.findings.filter(x => x.severity === 'threat');
    const review = report.findings.filter(x => x.severity === 'review');
    el('files').textContent = report.filesScanned.toLocaleString(); el('threats').textContent = threats.length; el('review').textContent = review.length;
    el('status').textContent = threats.length ? 'Threats detected' : 'Scan complete';
    el('detail').textContent = threats.length ? 'Review the threats below before taking action.' : 'No known test signatures were detected.';
    el('time').textContent = `${(report.elapsedMs/1000).toFixed(1)} seconds${report.truncated ? ' · file limit reached' : ''}`;
    el('list').innerHTML = report.findings.length ? report.findings.map(f => `<div class="finding"><span class="badge ${f.severity}">${f.severity.toUpperCase()}</span><div><b>${f.reason}</b><p>${f.file}</p></div></div>`).join('') : '<div class="empty">No threats or review items were found.</div>';
  } catch (error) { el('status').textContent = 'Scan unavailable'; el('detail').textContent = error.message; }
  finally { button.disabled = false; button.textContent = 'Start scan'; }
});
