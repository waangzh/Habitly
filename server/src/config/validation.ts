const REQUIRED_KEYS = [
  'MYSQL_HOST',
  'MYSQL_PORT',
  'MYSQL_USERNAME',
  'MYSQL_DATABASE',
  'REDIS_HOST',
  'REDIS_PORT',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
];

export function validateEnv(env: Record<string, string | undefined>): Record<string, string | undefined> {
  const missing = REQUIRED_KEYS.filter((key) => !env[key]);
  if (missing.length) {
    throw new Error(`缺少必要环境变量: ${missing.join(', ')}`);
  }

  ['PORT', 'MYSQL_PORT', 'REDIS_PORT', 'REDIS_DB', 'DEEPSEEK_TIMEOUT_MS'].forEach((key) => {
    if (env[key] && Number.isNaN(Number(env[key]))) {
      throw new Error(`${key} 必须是数字`);
    }
  });

  return env;
}
