import http from 'node:http'

const PUBLIC_URL = 'http://127.0.0.1:4175/index.html'
const PUBLIC_ORIGIN = 'http://127.0.0.1:4175'
const NONCE = '12345678-1234-1234-1234-123456789012'

const html = `<!doctype html><html><body style="margin:0">
<iframe id="preview" src="${PUBLIC_URL}" style="width:100%;height:900px;border:0"></iframe>
<script>
  const iframe = document.getElementById('preview');
  const common = {schema:'slt.page-settings-preview.v1',protocolVersion:1,nonce:'${NONCE}',tenantId:'tenant-magurophone',tenantSlug:'magurophone',publicUrl:'${PUBLIC_URL}'};
  window.previewMessages = [];
  window.previewReady = false;
  window.previewDraft = {};
  window.previewMode = 'readonly';
  function post(type, extra = {}) { iframe.contentWindow.postMessage({...common,type,...extra}, '${PUBLIC_ORIGIN}'); }
  function hello() { if (!window.previewReady) post('slt.page-preview.hello'); }
  const retry = setInterval(hello, 100);
  iframe.addEventListener('load', hello);
  window.addEventListener('message', event => {
    if (event.origin !== '${PUBLIC_ORIGIN}' || event.source !== iframe.contentWindow) return;
    window.previewMessages.push(event.data);
    if (event.data.type === 'slt.page-preview.ready') {
      window.previewReady = true;
      clearInterval(retry);
      window.sendPreviewState(window.previewDraft, window.previewMode, null);
    }
  });
  window.sendPreviewState = (draft, mode = 'edit', selectedTarget = null, override = {}) => {
    window.previewDraft = draft;
    window.previewMode = mode;
    post('slt.page-preview.state', {payload:{draft,mode,selectedTarget}, ...override});
  };
</script></body></html>`

function createServer(port) {
  return http.createServer((request, response) => {
    if (request.url === '/health') {
      response.writeHead(200, { 'Content-Type': 'text/plain' })
      response.end('ok')
      return
    }
    response.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' })
    response.end(html)
  }).listen(port, '127.0.0.1')
}

const servers = [createServer(4185), createServer(4186)]
function close() {
  for (const server of servers) server.close()
}
process.on('SIGINT', close)
process.on('SIGTERM', close)
