// Bilibili API CORS 代理（Cloudflare Worker）
// 用途：解决 GitHub Pages 与 api.bilibili.com 不同源导致的浏览器 fetch/xhr 跨域读取限制。
// 部署后，在 bilibili.html 中将 window.BILI_PROXY_BASE 改为：
// window.BILI_PROXY_BASE = 'https://你的-worker.workers.dev/?url=';

const ALLOWED_HOSTS = new Set([
  'api.bilibili.com',
]);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== 'GET') {
      return jsonResponse({ code: -405, message: '只允许 GET 请求' }, 405);
    }

    const requestUrl = new URL(request.url);
    const target = requestUrl.searchParams.get('url');

    if (!target) {
      return jsonResponse({ code: -400, message: '缺少 url 参数' }, 400);
    }

    let targetUrl;
    try {
      targetUrl = new URL(target);
    } catch {
      return jsonResponse({ code: -400, message: 'url 参数格式错误' }, 400);
    }

    if (targetUrl.protocol !== 'https:' || !ALLOWED_HOSTS.has(targetUrl.hostname)) {
      return jsonResponse({ code: -403, message: '仅允许代理 api.bilibili.com 的 HTTPS 请求' }, 403);
    }

    const upstreamResponse = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json,text/plain,*/*',
        'Referer': 'https://www.bilibili.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      },
    });

    const responseHeaders = new Headers(upstreamResponse.headers);
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      responseHeaders.set(key, value);
    }
    responseHeaders.set('Cache-Control', 'no-store');

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  },
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
    },
  });
}
