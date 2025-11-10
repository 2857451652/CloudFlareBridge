/**
 * Cloudflare Worker 反向代理
 * 将 www.cisg.ai 的请求代理到 HuggingFace Space，同时保持 URL 不变
 */

const TARGET_URL = 'https://jnsecret-metarec.hf.space';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 处理 WebSocket 升级请求
    if (request.headers.get('Upgrade') === 'websocket') {
      return fetch(new URL(url.pathname + url.search, TARGET_URL), request);
    }
    
    // 构建目标 URL
    const targetUrl = new URL(url.pathname + url.search, TARGET_URL);
    
    try {
      // 创建新的请求，复制原始请求的头部
      const headers = new Headers(request.headers);
      
      // 移除可能引起问题的头部
      headers.delete('cf-connecting-ip');
      headers.delete('cf-ray');
      headers.delete('cf-visitor');
      headers.delete('cf-request-id');
      
      // 设置 Referer 为目标 URL（某些服务器需要）
      headers.set('Referer', TARGET_URL);
      
      // 创建转发请求
      const proxyRequest = new Request(targetUrl.toString(), {
        method: request.method,
        headers: headers,
        body: request.body,
        redirect: 'follow'
      });

      // 发送请求到目标服务器
      const response = await fetch(proxyRequest);
      
      // 检查响应状态
      if (!response.ok && response.status !== 304) {
        console.error(`Proxy request failed: ${response.status} ${response.statusText} for ${targetUrl.toString()}`);
      }
      
      // 获取响应内容类型
      const contentType = response.headers.get('content-type') || '';
      
      // 如果是 HTML 内容，需要重写其中的链接
      if (contentType.includes('text/html')) {
        let html = await response.text();
        
        // 重写 HTML 中的链接和资源路径
        html = rewriteHtml(html, url.origin);
        
        // 创建新的响应
        const newResponse = new Response(html, {
          status: response.status,
          statusText: response.statusText,
          headers: rewriteHeaders(response.headers, url.origin, TARGET_URL)
        });
        
        return newResponse;
      } else {
        // 对于非 HTML 内容（CSS、JS、图片等），直接返回但重写头部
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: rewriteHeaders(response.headers, url.origin, TARGET_URL)
        });
      }
    } catch (error) {
      // 错误处理 - 记录详细错误信息
      console.error('Proxy Error:', error);
      return new Response(`Proxy Error: ${error.message}\n\nTarget: ${targetUrl.toString()}`, {
        status: 500,
        headers: { 
          'Content-Type': 'text/plain',
          'X-Error': error.message
        }
      });
    }
  }
};

/**
 * 重写 HTML 内容中的链接
 */
function rewriteHtml(html, origin) {
  // 替换绝对 URL（指向 HuggingFace 的链接）
  html = html.replace(
    /https?:\/\/jnsecret-metarec\.hf\.space/gi,
    origin
  );
  
  // 替换单引号中的 URL
  html = html.replace(
    /(href|src|action)=['"]https?:\/\/jnsecret-metarec\.hf\.space([^'"]*)['"]/gi,
    `$1="${origin}$2"`
  );
  
  // 替换相对路径（确保它们指向正确的域名）
  html = html.replace(
    /(href|src|action)=["'](\/[^"']*)["']/g,
    (match, attr, path) => {
      // 如果路径不是以 http 开头，则使用当前域名
      if (!path.startsWith('http')) {
        return `${attr}="${path}"`;
      }
      return match;
    }
  );
  
  // 处理 base 标签
  html = html.replace(
    /<base\s+href=["'][^"']*["']/gi,
    `<base href="${origin}/"`
  );
  
  // 如果没有 base 标签，添加一个
  if (!html.includes('<base')) {
    html = html.replace(
      /<head>/i,
      `<head><base href="${origin}/">`
    );
  }
  
  // 处理 JavaScript 中的 URL
  html = html.replace(
    /(['"])(https?:\/\/jnsecret-metarec\.hf\.space)([^'"]*)\1/gi,
    `$1${origin}$3$1`
  );
  
  return html;
}

/**
 * 重写响应头部
 */
function rewriteHeaders(headers, origin, targetUrl) {
  const newHeaders = new Headers();
  
  // 复制所有头部
  for (const [key, value] of headers.entries()) {
    const lowerKey = key.toLowerCase();
    
    // 跳过一些不应该传递的头部
    if (lowerKey === 'content-encoding') {
      continue; // 让 Cloudflare 处理压缩
    }
    
    // 跳过 Cloudflare 特定的头部
    if (lowerKey.startsWith('cf-') || 
        lowerKey === 'server' || 
        lowerKey === 'x-powered-by' ||
        lowerKey === 'transfer-encoding') {
      continue;
    }
    
    // 重写 Location 头部（用于重定向）
    if (lowerKey === 'location') {
      try {
        const locationUrl = new URL(value, targetUrl);
        if (locationUrl.hostname === 'jnsecret-metarec.hf.space') {
          newHeaders.set(key, locationUrl.pathname + locationUrl.search);
        } else {
          newHeaders.set(key, value);
        }
      } catch (e) {
        // 如果 URL 解析失败，保持原值
        newHeaders.set(key, value);
      }
    } else {
      newHeaders.set(key, value);
    }
  }
  
  // 设置 CORS 头部（如果需要）
  newHeaders.set('Access-Control-Allow-Origin', '*');
  newHeaders.set('X-Proxy-By', 'Cloudflare-Worker');
  
  return newHeaders;
}

