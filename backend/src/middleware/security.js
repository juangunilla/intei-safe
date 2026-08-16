const createRateLimiter = ({ windowMs, max, message }) => {
  const clients = new Map();

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of clients) if (value.resetAt <= now) clients.delete(key);
  }, windowMs);
  cleanup.unref?.();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const current = clients.get(key);
    const entry = !current || current.resetAt <= now
      ? { count: 1, resetAt: now + windowMs }
      : { ...current, count: current.count + 1 };
    clients.set(key, entry);
    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', Math.max(0, max - entry.count));
    if (entry.count > max) return res.status(429).json({ message });
    return next();
  };
};

const securityHeaders = (_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  next();
};

module.exports = { createRateLimiter, securityHeaders };
