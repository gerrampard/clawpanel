/**
 * 模型配置页面
 */
import { api } from '../lib/tauri-api.js'
import { toast } from '../components/toast.js'
import { showModal } from '../components/modal.js'

export async function render() {
  const page = document.createElement('div')
  page.className = 'page'

  page.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">模型配置</h1>
      <p class="page-desc">管理 AI 模型 Provider 和模型列表</p>
    </div>
    <div class="config-actions">
      <button class="btn btn-primary btn-sm" id="btn-add-provider">+ 添加 Provider</button>
      <button class="btn btn-secondary btn-sm" id="btn-save-models">保存配置</button>
    </div>
    <div id="providers-list">加载中...</div>
  `

  const state = { config: null }
  await loadConfig(page, state)

  page.querySelector('#btn-save-models').onclick = () => saveConfig(state)
  page.querySelector('#btn-add-provider').onclick = () => addProvider(page, state)

  return page
}

async function loadConfig(page, state) {
  try {
    state.config = await api.readOpenclawConfig()
    renderProviders(page, state)
  } catch (e) {
    toast('加载配置失败: ' + e, 'error')
  }
}

function renderProviders(page, state) {
  const listEl = page.querySelector('#providers-list')
  const providers = state.config?.models?.providers || {}
  const keys = Object.keys(providers)

  if (!keys.length) {
    listEl.innerHTML = '<div style="color:var(--text-tertiary);padding:20px">暂无 Provider 配置，点击上方按钮添加</div>'
    return
  }

  listEl.innerHTML = keys.map(key => {
    const p = providers[key]
    const models = p.models || []
    return `
      <div class="config-section" data-provider="${key}">
        <div class="config-section-title" style="display:flex;justify-content:space-between;align-items:center">
          <span>${key}</span>
          <div style="display:flex;gap:8px">
            <button class="btn btn-sm btn-secondary" data-action="toggle">展开/收起</button>
            <button class="btn btn-sm btn-danger" data-action="delete-provider">删除</button>
          </div>
        </div>
        <div class="provider-meta" style="margin-bottom:12px">
          <div class="form-group" style="margin-bottom:8px">
            <label class="form-label">Base URL</label>
            <input class="form-input" data-field="baseUrl" value="${p.baseUrl || ''}">
          </div>
          <div class="form-group" style="margin-bottom:8px">
            <label class="form-label">API 类型</label>
            <select class="form-input" data-field="apiType">
              <option value="openai" ${p.apiType === 'openai' ? 'selected' : ''}>OpenAI</option>
              <option value="anthropic" ${p.apiType === 'anthropic' ? 'selected' : ''}>Anthropic</option>
              <option value="google" ${p.apiType === 'google' ? 'selected' : ''}>Google</option>
            </select>
          </div>
        </div>
        <div class="provider-models" style="display:none">
          <div style="font-size:var(--font-size-sm);color:var(--text-secondary);margin-bottom:8px">
            模型列表 (${models.length})
          </div>
          ${models.map((m, i) => `
            <div class="model-item" style="background:var(--bg-tertiary);padding:8px 12px;border-radius:var(--radius-sm);margin-bottom:6px;display:flex;justify-content:space-between;align-items:center">
              <span style="font-family:var(--font-mono);font-size:var(--font-size-sm)">${m.id || m}</span>
              <button class="btn btn-sm btn-danger" data-action="delete-model" data-index="${i}">删除</button>
            </div>
          `).join('')}
          <button class="btn btn-sm btn-secondary" data-action="add-model" style="margin-top:4px">+ 添加模型</button>
        </div>
      </div>
    `
  }).join('')

  // 绑定事件
  listEl.querySelectorAll('[data-action]').forEach(btn => {
    btn.onclick = () => {
      const section = btn.closest('[data-provider]')
      const providerKey = section.dataset.provider
      const action = btn.dataset.action

      if (action === 'toggle') {
        const models = section.querySelector('.provider-models')
        models.style.display = models.style.display === 'none' ? 'block' : 'none'
      } else if (action === 'delete-provider') {
        delete state.config.models.providers[providerKey]
        renderProviders(page, state)
        toast(`已删除 ${providerKey}`, 'info')
      } else if (action === 'delete-model') {
        const idx = parseInt(btn.dataset.index)
        state.config.models.providers[providerKey].models.splice(idx, 1)
        renderProviders(page, state)
      } else if (action === 'add-model') {
        showModal({
          title: '添加模型',
          fields: [{ name: 'id', label: '模型 ID', placeholder: '如 claude-opus-4-6' }],
          onConfirm: ({ id }) => {
            if (id) {
              state.config.models.providers[providerKey].models.push({ id })
              renderProviders(page, state)
            }
          },
        })
      }
    }
  })

  // 输入框变更同步到 state
  listEl.querySelectorAll('[data-field]').forEach(input => {
    input.onchange = () => {
      const providerKey = input.closest('[data-provider]').dataset.provider
      state.config.models.providers[providerKey][input.dataset.field] = input.value
    }
  })
}

function addProvider(page, state) {
  showModal({
    title: '添加 Provider',
    fields: [
      { name: 'key', label: 'Provider 名称', placeholder: '如 openai, newapi' },
      { name: 'baseUrl', label: 'Base URL', placeholder: 'https://api.openai.com/v1' },
      {
        name: 'apiType', label: 'API 类型', type: 'select',
        options: [
          { value: 'openai', label: 'OpenAI' },
          { value: 'anthropic', label: 'Anthropic' },
          { value: 'google', label: 'Google' },
        ],
      },
    ],
    onConfirm: ({ key, baseUrl, apiType }) => {
      if (!key) return
      if (!state.config.models) state.config.models = { mode: 'replace', providers: {} }
      if (!state.config.models.providers) state.config.models.providers = {}
      state.config.models.providers[key] = { baseUrl, apiType, models: [] }
      renderProviders(page, state)
      toast(`已添加 ${key}`, 'success')
    },
  })
}

async function saveConfig(state) {
  try {
    await api.writeOpenclawConfig(state.config)
    toast('配置已保存', 'success')
  } catch (e) {
    toast('保存失败: ' + e, 'error')
  }
}
