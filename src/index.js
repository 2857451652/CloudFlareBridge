/**
 * Cloudflare Worker 反向代理
 * 将 www.cisg.ai 的请求代理到 HuggingFace Space，同时保持 URL 不变
 */

const TARGET_URL = 'https://jnsecret-metarec.hf.space';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 构建目标 URL
    const targetUrl = new URL(url.pathname + url.search, TARGET_URL);
    
    try {
      // 创建新的请求，复制原始请求的头部
      const headers = new Headers(request.headers);
      
      // 更新 Host 头部指向目标服务器
      headers.set('Host', targetUrl.hostname);
      
      // 移除可能引起问题的头部
      headers.delete('cf-connecting-ip');
      headers.delete('cf-ray');
      headers.delete('cf-visitor');
      
      // 创建转发请求
      const proxyRequest = new Request(targetUrl.toString(), {
        method: request.method,
        headers: headers,
        body: request.body,
        redirect: 'follow'
      });

      // 发送请求到目标服务器
      const response = await fetch(proxyRequest);
      
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
          headers: rewriteHeaders(response.headers, url.origin)
        });
        
        return newResponse;
      } else {
        // 对于非 HTML 内容（CSS、JS、图片等），直接返回但重写头部
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: rewriteHeaders(response.headers, url.origin)
        });
      }
    } catch (error) {
      // 错误处理
      return new Response(`Proxy Error: ${error.message}`, {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
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
    /https?:\/\/jnsecret-metarec\.hf\.space/g,
    origin
  );
  
  // 替换相对路径（确保它们指向正确的域名）
  html = html.replace(
    /(href|src|action)="(\/[^"]*)"/g,
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
  
  return html;
}

/**
 * 重写响应头部
 */
function rewriteHeaders(headers, origin) {
  const newHeaders = new Headers();
  
  // 复制所有头部
  for (const [key, value] of headers.entries()) {
    // 跳过一些不应该传递的头部
    if (key.toLowerCase() === 'content-encoding') {
      continue; // 让 Cloudflare 处理压缩
    }
    
    // 重写 Location 头部（用于重定向）
    if (key.toLowerCase() === 'location') {
      const locationUrl = new URL(value, TARGET_URL);
      if (locationUrl.hostname === 'jnsecret-metarec.hf.space') {
        newHeaders.set(key, locationUrl.pathname + locationUrl.search);
      } else {
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

