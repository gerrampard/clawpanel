/**
 * Tauri API 封装层
 * 开发阶段用 mock 数据，Tauri 环境用 invoke
 */

const isTauri = !!window.__TAURI__

async function invoke(cmd, args = {}) {
  if (isTauri) {
    const { invoke: tauriInvoke } = await import('@tauri-apps/api/core')
    return tauriInvoke(cmd, args)
  }
  // 开发模式 mock
  return mockInvoke(cmd, args)
}

// Mock 数据，方便纯浏览器开发调试
function mockInvoke(cmd, args) {
  const mocks = {
    get_services_status: () => [
      { label: 'ai.openclaw.gateway', pid: 54284, running: true, description: 'OpenClaw Gateway' },
      { label: 'com.openclaw.guardian.watch', pid: 54301, running: true, description: '健康监控 (60s)' },
      { label: 'com.openclaw.guardian.backup', pid: null, running: false, description: '配置备份 (3600s)' },
      { label: 'com.openclaw.watchdog', pid: 54320, running: true, description: '看门狗 (120s)' },
    ],
    get_version_info: () => ({
      current: '2026.2.23',
      latest: null,
      update_available: false,
    }),
    read_openclaw_config: () => ({
      meta: { lastTouchedVersion: '2026.2.23' },
      models: {
        mode: 'replace',
        providers: {
          'newapi-claude': {
            baseUrl: 'http://192.168.1.14:30080/v1',
            apiType: 'openai',
            models: [
              { id: 'claude-opus-4-6' },
              { id: 'claude-sonnet-4-5' },
            ],
          },
        },
      },
      agents: {
        defaults: {
          model: { primary: 'newapi-claude/claude-opus-4-6', fallbacks: ['newapi-claude/claude-sonnet-4-5'] },
          maxConcurrent: 4,
          subagents: 2,
        },
      },
      gateway: { port: 18789, mode: 'local', bind: 'loopback', authToken: '' },
    }),
    write_openclaw_config: () => true,
    read_log_tail: ({ logName }) => {
      const logs = {
        'gateway': [
          '2026-02-26 13:29:01 [INFO] Gateway started on :18789',
          '2026-02-26 13:29:02 [INFO] Agent connected: claude-opus-4-6',
          '2026-02-26 13:29:05 [INFO] Request /v1/chat/completions → 200 (1.2s)',
          '2026-02-26 13:30:12 [INFO] Request /v1/chat/completions → 200 (3.8s)',
          '2026-02-26 13:31:00 [WARN] Rate limit approaching: 45/50 rpm',
          '2026-02-26 13:32:15 [INFO] Request /v1/chat/completions → 200 (2.1s)',
        ],
        'gateway-err': ['2026-02-26 12:00:01 [ERROR] Upstream 502: connection refused'],
        'guardian': ['2026-02-26 13:29:00 [INFO] Health check passed', '2026-02-26 13:30:00 [INFO] Health check passed'],
        'guardian-backup': ['2026-02-26 12:00:00 [INFO] Backup completed: openclaw.json.bak'],
        'config-audit': ['{"ts":"2026-02-26T13:29:00Z","action":"config.read","file":"openclaw.json"}'],
      }
      return (logs[logName] || logs['gateway']).join('\n')
    },
    search_log: ({ query }) => [
      `2026-02-26 13:29:01 [INFO] Match: ${query}`,
      `2026-02-26 13:30:12 [INFO] Found: ${query} in request`,
    ],
    list_memory_files: ({ category }) => {
      const files = {
        memory: ['active-context.md', 'decisions.md', 'progress.md'],
        archive: ['2026-02-sprint1.md', '2026-02-sprint2.md'],
        core: ['AGENTS.md', 'CLAUDE.md'],
      }
      return files[category] || files.memory
    },
    read_memory_file: ({ path }) => `# ${path}\n\n这是 ${path} 的内容示例。\n\n## 概述\n\n在此记录工作记忆...`,
    write_memory_file: () => true,
    read_mcp_config: () => ({
      mcpServers: {
        'exa': { command: 'npx', args: ['-y', '@anthropic/exa-mcp-server'], env: { EXA_API_KEY: '***' } },
        'web-reader': { command: 'npx', args: ['-y', '@anthropic/web-reader-mcp'], env: {} },
        'pal': { command: 'node', args: ['/opt/pal-mcp/index.js'], env: {} },
      },
    }),
    write_mcp_config: () => true,
    start_service: () => true,
    stop_service: () => true,
    restart_service: () => true,
    write_env_file: () => true,
  }
  const fn = mocks[cmd]
  return fn ? Promise.resolve(fn(args)) : Promise.reject(`未知命令: ${cmd}`)
}

// 导出 API
export const api = {
  // 服务管理
  getServicesStatus: () => invoke('get_services_status'),
  startService: (label) => invoke('start_service', { label }),
  stopService: (label) => invoke('stop_service', { label }),
  restartService: (label) => invoke('restart_service', { label }),

  // 配置
  getVersionInfo: () => invoke('get_version_info'),
  readOpenclawConfig: () => invoke('read_openclaw_config'),
  writeOpenclawConfig: (config) => invoke('write_openclaw_config', { config }),
  readMcpConfig: () => invoke('read_mcp_config'),
  writeMcpConfig: (config) => invoke('write_mcp_config', { config }),

  // 日志
  readLogTail: (logName, lines = 100) => invoke('read_log_tail', { logName, lines }),
  searchLog: (logName, query, maxResults = 50) => invoke('search_log', { logName, query, maxResults }),

  // 记忆文件
  listMemoryFiles: (category) => invoke('list_memory_files', { category }),
  readMemoryFile: (path) => invoke('read_memory_file', { path }),
  writeMemoryFile: (path, content) => invoke('write_memory_file', { path, content }),

  // 安装/部署
  checkInstallation: () => invoke('check_installation'),
  getDeployConfig: () => invoke('get_deploy_config'),
  writeEnvFile: (path, config) => invoke('write_env_file', { path, config }),
}
