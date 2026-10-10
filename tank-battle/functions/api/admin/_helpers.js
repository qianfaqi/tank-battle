// 管理员密钥校验：从请求头 X-Admin-Key 读取，对比环境变量 ADMIN_KEY
export function checkAdmin(request, env) {
  if (!env.ADMIN_KEY) {
    return { ok: false, error: '服务器未配置 ADMIN_KEY 环境变量（Pages → Settings → Environment variables）' };
  }
  const key = request.headers.get('X-Admin-Key');
  if (!key || key !== env.ADMIN_KEY) {
    return { ok: false, error: '管理员密钥错误' };
  }
  return { ok: true };
}