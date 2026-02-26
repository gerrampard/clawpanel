/**
 * Modal 弹窗组件
 */
export function showModal({ title, fields, onConfirm }) {
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'

  const fieldHtml = fields.map(f => `
    <div class="form-group">
      <label class="form-label">${f.label}</label>
      ${f.type === 'select'
        ? `<select class="form-input" data-name="${f.name}">
            ${f.options.map(o => `<option value="${o.value}" ${o.value === f.value ? 'selected' : ''}>${o.label}</option>`).join('')}
           </select>`
        : `<input class="form-input" data-name="${f.name}" value="${f.value || ''}" placeholder="${f.placeholder || ''}">`
      }
    </div>
  `).join('')

  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-title">${title}</div>
      ${fieldHtml}
      <div class="modal-actions">
        <button class="btn btn-secondary btn-sm" data-action="cancel">取消</button>
        <button class="btn btn-primary btn-sm" data-action="confirm">确定</button>
      </div>
    </div>
  `

  document.body.appendChild(overlay)

  // 点击遮罩关闭
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove()
  })

  overlay.querySelector('[data-action="cancel"]').onclick = () => overlay.remove()

  overlay.querySelector('[data-action="confirm"]').onclick = () => {
    const result = {}
    overlay.querySelectorAll('[data-name]').forEach(el => {
      result[el.dataset.name] = el.value
    })
    overlay.remove()
    onConfirm(result)
  }

  // 自动聚焦第一个输入框
  const firstInput = overlay.querySelector('input, select')
  if (firstInput) firstInput.focus()
}
