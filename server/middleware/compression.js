/**
 * Response Compression Middleware
 * Compresses HTTP responses to reduce bandwidth
 */

import zlib from 'zlib';

/**
 * Compress response based on Accept-Encoding header
 */
export function compressionMiddleware(req, res, next) {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  
  // Only compress if client supports it
  if (!acceptEncoding.includes('gzip') && !acceptEncoding.includes('deflate')) {
    return next();
  }

  // Don't compress if response is already compressed
  if (res.getHeader('Content-Encoding')) {
    return next();
  }

  // Override res.send to compress before sending
  const originalSend = res.send;
  const originalJson = res.json;

  res.send = function (data) {
    if (shouldCompress(res, data)) {
      compressAndSend(res, data, acceptEncoding, originalSend);
    } else {
      originalSend.call(this, data);
    }
  };

  res.json = function (data) {
    if (shouldCompress(res, data)) {
      const jsonString = JSON.stringify(data);
      compressAndSend(res, jsonString, acceptEncoding, originalSend);
    } else {
      originalJson.call(this, data);
    }
  };

  next();
}

/**
 * Determine if response should be compressed
 */
function shouldCompress(res, data) {
  // Don't compress small responses (< 1KB)
  const size = Buffer.byteLength(typeof data === 'string' ? data : JSON.stringify(data));
  if (size < 1024) return false;

  // Don't compress images or already compressed content
  const contentType = res.getHeader('Content-Type') || '';
  const skipTypes = ['image/', 'video/', 'audio/', 'application/zip', 'application/gzip'];
  if (skipTypes.some(type => contentType.includes(type))) return false;

  return true;
}

/**
 * Compress and send response
 */
function compressAndSend(res, data, acceptEncoding, originalSend) {
  const buffer = Buffer.from(typeof data === 'string' ? data : JSON.stringify(data));

  if (acceptEncoding.includes('gzip')) {
    zlib.gzip(buffer, (err, compressed) => {
      if (err) {
        return originalSend.call(res, data);
      }
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Content-Length', compressed.length);
      originalSend.call(res, compressed);
    });
  } else if (acceptEncoding.includes('deflate')) {
    zlib.deflate(buffer, (err, compressed) => {
      if (err) {
        return originalSend.call(res, data);
      }
      res.setHeader('Content-Encoding', 'deflate');
      res.setHeader('Content-Length', compressed.length);
      originalSend.call(res, compressed);
    });
  } else {
    originalSend.call(res, data);
  }
}

export default compressionMiddleware;
