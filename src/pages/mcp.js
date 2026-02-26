/**
 * MCP 工具配置页面
 */
import { api } from '../lib/tauri-api.js'
import { toast } from '../components/toast.js'
import { showModal } from '../components/modal.js'

export async function render() {
  const page = document.createElement('div')
  page.className = 'page'

  page.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">MCP 工具</h1>
      <p class="page-desc">管理 MCP Server 配置</p>
    </div>
    <div class="config-actions">
      <button class="btn btn-primary btn-sm" id="btn-add-mcp">+ 添加 MCP Server</button>
      <button class="btn btn-secondary btn-sm" id="btn-save-mcp">保存配置</button>
    </div>
    <div id="mcp-list">加载中...</div>
  `

  const state = { config: null }
  await loadConfig(page, state)

  page.querySelector('#btn-save-mcp').onclick = () => saveConfig(state)
  page.querySelector('#btn-add-mcp').onclick = () => addServer(page, state)
  return page
}

async function loadConfig(page, state) {
  try {
    state.config = await api.readMcpConfig()
    renderServers(page, state)
  } catch (e) {
    toast('加载 MCP 配置失败: ' + e, 'error')
  }
}

function renderServers(page, state) {
  const listEl = page.querySelector('#mcp-list')
  const servers = state.config?.mcpServers || state.config || {}
  const keys = Object.keys(servers)

  if (!keys.length) {
    listEl.innerHTML = '<div style="color:var(--text-tertiary);padding:20px">暂无 MCP Server 配置</div>'
    return
  }

  listEl.innerHTML = keys.map(key => {
    const s = servers[key]
    const type = s.url ? 'http' : 'stdio'
    return `
      <div class="service-card" data-server="${key}">
        <div class="service-info">
          <span class="status-dot running"></span>
          <div>
            <div class="service-name">${key}</div>
            <div class="service-desc">${type} · ${type === 'stdio' ? (s.command || '') : (s.url || '')}</div>
          </div>
        </div>
        <div class="service-actions">
          <button class="btn btn-sm btn-secondary" data-action="edit">编辑</button>
          <button class="btn btn-sm btn-danger" data-action="delete">删除</button>
        </div>
      </div>
    `
  }).join('')

  // 绑定事件
  listEl.querySelectorAll('[data-action]').forEach(btn => {
    btn.onclick = () => {
      const card = btn.closest('[data-server]')
      const key = card.dataset.server
      const action = btn.dataset.action

      if (action === 'delete') {
        if (state.config.mcpServers) delete state.config.mcpServers[key]
        else delete state.config[key]
        renderServers(page, state)
        toast(`已删除 ${key}`, 'info')
      } else if (action === 'edit') {
        editServer(page, state, key)
      }
    }
  })
}

function editServer(page, state, key) {
  const servers = state.config?.mcpServers || state.config || {}
  const s = servers[key] || {}
  const json = JSON.stringify(s, null, 2)

  const listEl = page.querySelector('#mcp-list')
  listEl.innerHTML = `
    <div class="config-section">
      <div class="config-section-title">编辑: ${key}</div>
      <div class="form-group">
        <label class="form-label">JSON 配置</label>
        <textarea class="form-input" id="mcp-json" rows="12" style="font-family:var(--font-mono);font-size:var(--font-size-sm)">${escapeHtml(json)}</textarea>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary btn-sm" id="btn-apply-edit">应用</button>
        <button class="btn btn-secondary btn-sm" id="btn-cancel-edit">取消</button>
      </div>
    </div>
  `

  listEl.querySelector('#btn-apply-edit').onclick = () => {
    try {
      const parsed = JSON.parse(listEl.querySelector('#mcp-json').value)
      if (state.config.mcpServers) state.config.mcpServers[key] = parsed
      else state.config[key] = parsed
      renderServers(page, state)
      toast('已应用修改', 'success')
    } catch (e) {
      toast('JSON 格式错误: ' + e.message, 'error')
    }
  }

  listEl.querySelector('#btn-cancel-edit').onclick = () => renderServers(page, state)
}

function addServer(page, state) {
  showModal({
    title: '添加 MCP Server',
    fields: [
      { name: 'name', label: 'Server 名称', placeholder: '如 exa, web-reader' },
      { name: 'command', label: '启动命令', placeholder: '如 npx, node' },
    ],
    onConfirm: ({ name, command }) => {
      if (!name) return
      const target = state.config?.mcpServers || state.config
      target[name] = { command: command || '', args: [], env: {} }
      renderServers(page, state)
      toast(`已添加 ${name}`, 'success')
    },
  })
}

async function saveConfig(state) {
  try {
    await api.writeMcpConfig(state.config)
    toast('MCP 配置已保存', 'success')
  } catch (e) {
    toast('保存失败: ' + e, 'error')
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
