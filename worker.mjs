// Workers Static Assets can return the full MP3 for a byte-range request.
export default {
  async fetch(request, env) {
    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 200 || !['GET', 'HEAD'].includes(request.method) ||
        !new URL(request.url).pathname.endsWith('.mp3')) return asset;

    const headers = new Headers(asset.headers);
    headers.set('Accept-Ranges', 'bytes');
    const full = () => new Response(asset.body, { status: 200, headers });
    const range = request.headers.get('Range');
    if (request.method === 'HEAD' || !range) return full();

    const validator = request.headers.get('If-Range');
    if (validator && validator !== headers.get('ETag') &&
        validator !== headers.get('Last-Modified')) return full();
    const match = /^bytes=(\d*)-(\d*)$/i.exec(range.trim());
    if (!match || (!match[1] && !match[2])) return full();

    const bytes = await asset.arrayBuffer();
    const size = bytes.byteLength;
    const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
    const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    headers.delete('Content-Encoding');
    if (start > end || start >= size) {
      headers.set('Content-Range', 'bytes */' + size);
      headers.set('Content-Length', '0');
      return new Response(null, { status: 416, headers });
    }
    headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
    headers.set('Content-Length', String(end - start + 1));
    headers.set('Content-Type', 'audio/mpeg');
    return new Response(new Uint8Array(bytes, start, end - start + 1), { status: 206, headers });
  }
};
