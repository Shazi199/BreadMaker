// ============================================
// 面包配方计算器 - 核心逻辑
// ============================================

// ============== 预设数据 ==============

const FLOUR_PRESETS = {
    bread: {
        name: '吐司面包',
        flours: [
            { name: '高筋面粉', protein: 13.5 },
            { name: '低筋面粉', protein: 8.5 }
        ],
        targetProtein: 12.5,
        totalFlour: 500
    },
    baguette: {
        name: '法棍',
        flours: [
            { name: '高筋面粉', protein: 13.0 }
        ],
        targetProtein: 13.0,
        totalFlour: 500
    },
    wholewheat: {
        name: '全麦吐司',
        flours: [
            { name: '高筋面粉', protein: 13.5 },
            { name: '全麦面粉', protein: 13.5 }
        ],
        targetProtein: 13.5,
        totalFlour: 500
    },
    cake: {
        name: '蛋糕',
        flours: [
            { name: '低筋面粉', protein: 8.5 }
        ],
        targetProtein: 8.5,
        totalFlour: 300
    }
};

const LIQUID_PRESETS = {
    water: { name: '水', waterContent: 100 },
    milk: { name: '全脂牛奶', waterContent: 87.5 },
    egg: { name: '全蛋液', waterContent: 75 },
    eggwhite: { name: '蛋清', waterContent: 88 },
    yogurt: { name: '酸奶', waterContent: 85 }
};

const EXTRA_PRESETS = {
    butter: { name: '黄油', percent: 5 },
    salt: { name: '盐', percent: 2 },
    yeast: { name: '酵母', percent: 1.5 },
    milkpowder: { name: '奶粉', percent: 4 }
};

const SUGAR_PRESETS = {
    white: { name: '细砂糖', sugarContent: 100 },
    brown: { name: '红糖/黑糖', sugarContent: 95 },
    powder: { name: '糖粉', sugarContent: 97 },
    honey: { name: '蜂蜜', sugarContent: 80 }
};

// ============== 状态管理 ==============

const state = {
    flours: [
        { name: '高筋面粉', protein: 13.5 },
        { name: '低筋面粉', protein: 8.5 }
    ],
    targetProtein: 12.5,
    totalFlour: 500,
    hydration: 65,
    liquids: [
        { name: '水', waterContent: 100, ratio: 100 }
    ],
    sugarPercent: 8,
    sugars: [
        { name: '细砂糖', sugarContent: 100, ratio: 100 }
    ],
    extras: [
        { name: '盐', percent: 2 },
        { name: '黄油', percent: 5 },
        { name: '酵母', percent: 1.5 }
    ]
};

// ============== 工具函数 ==============

function $(id) { return document.getElementById(id); }

function fmt(n, digits = 1) {
    if (!isFinite(n) || isNaN(n)) return '0.0';
    return Number(n).toFixed(digits);
}

function showToast(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2000);
}

// ============== 渲染：面粉 ==============

// 根据面粉蛋白质列表、目标蛋白质、总质量自动计算每种面粉所需质量
// 1 种面粉：全部使用该面粉
// 2 种面粉（蛋白不同）：Pearson's square 精确求解
// 2 种面粉（蛋白相同）：对半分配
// 3 种以上：按"距目标蛋白质远近"反比分配（最佳近似，无法精确达成目标）
function calculateFlourMasses(flours, total, target) {
    const n = flours.length;
    const masses = new Array(n).fill(0);
    if (n === 0) return masses;
    if (n === 1) { masses[0] = total; return masses; }

    if (n === 2) {
        const [a, b] = flours;
        if (a.protein === b.protein) {
            masses[0] = masses[1] = total / 2;
            return masses;
        }
        // Pearson's square: m_a = total * (target - p_b) / (p_a - p_b)
        let m0 = total * (target - b.protein) / (a.protein - b.protein);
        let m1 = total - m0;
        // 目标超出范围时夹紧到边界，再按比例归一化
        if (m0 < 0) { m0 = 0; m1 = total; }
        else if (m0 > total) { m0 = total; m1 = 0; }
        masses[0] = m0;
        masses[1] = m1;
        return masses;
    }

    // 3 种以上：反比距离分配（不要求精确达成目标）
    const eps = 0.01;
    const weights = flours.map(f => 1 / Math.max(Math.abs(f.protein - target), eps));
    const sumW = weights.reduce((s, w) => s + w, 0);
    return weights.map(w => total * w / sumW);
}

function renderFlours() {
    const container = $('flour-list');
    container.innerHTML = '';

    const masses = calculateFlourMasses(state.flours, state.totalFlour, state.targetProtein);

    state.flours.forEach((flour, idx) => {
        const mass = masses[idx];
        const ratio = state.totalFlour > 0 ? (mass / state.totalFlour) * 100 : 0;
        const row = document.createElement('div');
        row.className = 'row';
        row.innerHTML = `
            <div class="field">
                <label>面粉名称</label>
                <input type="text" data-idx="${idx}" data-field="name" value="${flour.name}" placeholder="如：高筋面粉">
            </div>
            <div class="field">
                <label>蛋白质 (%)</label>
                <input type="number" data-idx="${idx}" data-field="protein" value="${flour.protein}" min="0" max="50" step="0.1">
            </div>
            <div class="field">
                <label>实际克重 <span class="auto-tag">自动</span></label>
                <div class="row-result">
                    <div class="result-mass">${fmt(mass, 1)} g</div>
                    <div class="result-ratio">占比 ${fmt(ratio, 1)}%</div>
                </div>
            </div>
            <button class="btn-remove" data-action="remove-flour" data-idx="${idx}" title="删除">×</button>
        `;
        container.appendChild(row);
    });

    // 当有 3 种以上面粉时，给出提示
    if (state.flours.length >= 3) {
        const hint = document.createElement('div');
        hint.className = 'flour-hint';
        hint.innerHTML = '💡 3 种以上面粉时，系统按"距目标蛋白质远近"反比自动分配，无法精确达成目标蛋白质。';
        container.appendChild(hint);
    }
}

// 局部更新：重新计算所有面粉质量并刷新显示（任何一种面粉的蛋白质变化都会影响全部）
function updateFlourRow(idx) {
    const masses = calculateFlourMasses(state.flours, state.totalFlour, state.targetProtein);
    state.flours.forEach((flour, i) => {
        const row = $('flour-list').children[i];
        if (!row) return;
        const massEl = row.querySelector('.result-mass');
        const ratioEl = row.querySelector('.result-ratio');
        const mass = masses[i];
        const ratio = state.totalFlour > 0 ? (mass / state.totalFlour) * 100 : 0;
        if (massEl) massEl.textContent = fmt(mass, 1) + ' g';
        if (ratioEl) ratioEl.textContent = '占比 ' + fmt(ratio, 1) + '%';
    });
}

// ============== 渲染：液体 ==============

function renderLiquids() {
    const container = $('liquid-list');
    container.innerHTML = '';

    const totalWater = (state.hydration / 100) * state.totalFlour;
    $('total-water-amount').textContent = fmt(totalWater, 1);

    state.liquids.forEach((liq, idx) => {
        // 液体质量 = (比例 × 总水量) / 水的含量
        const ratio = liq.ratio / 100;
        const wc = liq.waterContent / 100;
        let mass = 0;
        if (wc > 0) {
            mass = (ratio * totalWater) / wc;
        }
        const row = document.createElement('div');
        row.className = 'row liquid-row';
        const invalid = wc <= 0;
        row.innerHTML = `
            <div class="field">
                <label>液体名称</label>
                <input type="text" data-idx="${idx}" data-field="name" value="${liq.name}" placeholder="如水、牛奶">
            </div>
            <div class="field">
                <label>水含量 (%)</label>
                <input type="number" data-idx="${idx}" data-field="waterContent" value="${liq.waterContent}" min="0" max="100" step="0.5">
            </div>
            <div class="field">
                <label>占比 (%)</label>
                <input type="number" data-idx="${idx}" data-field="ratio" value="${liq.ratio}" min="0" max="100" step="0.5">
            </div>
            <div class="field">
                <label>实际克重</label>
                <div class="row-result ${invalid ? 'invalid' : ''}">${invalid ? '水含量>0' : fmt(mass, 1) + ' g'}</div>
            </div>
            <button class="btn-remove" data-action="remove-liquid" data-idx="${idx}" title="删除">×</button>
        `;
        container.appendChild(row);
    });

    // 自动平衡比例
    if (state.liquids.length >= 2) {
        const btn = document.createElement('button');
        btn.className = 'btn-add';
        btn.style.marginTop = '8px';
        btn.textContent = '⚖️ 平均分配比例';
        btn.addEventListener('click', () => {
            const avg = Math.round((100 / state.liquids.length) * 10) / 10;
            state.liquids.forEach(l => l.ratio = avg);
            renderLiquids();
            renderSummary();
        });
        container.appendChild(btn);
    }
}

// 仅更新某一行液体的克重显示
function updateLiquidRow(idx) {
    const liq = state.liquids[idx];
    if (!liq) return;
    const totalWater = (state.hydration / 100) * state.totalFlour;
    const wc = liq.waterContent / 100;
    const invalid = wc <= 0;
    const mass = invalid ? 0 : (liq.ratio / 100) * totalWater / wc;
    const row = $('liquid-list').children[idx];
    if (!row) return;
    const resultEl = row.querySelector('.row-result');
    if (!resultEl) return;
    resultEl.textContent = invalid ? '水含量>0' : fmt(mass, 1) + ' g';
    resultEl.classList.toggle('invalid', invalid);
}

// ============== 渲染：糖 ==============

// 根据糖列表、含糖率、总面粉自动计算每种糖的实际克重
function calculateSugarMasses(sugars, totalFlour, sugarPercent) {
    const totalSugar = (sugarPercent / 100) * totalFlour;
    return sugars.map(s => {
        const sc = s.sugarContent / 100;
        return sc > 0 ? (s.ratio / 100) * totalSugar / sc : 0;
    });
}

function renderSugars() {
    const container = $('sugar-list');
    container.innerHTML = '';

    const totalSugar = (state.sugarPercent / 100) * state.totalFlour;
    $('total-sugar-amount').textContent = fmt(totalSugar, 1);

    state.sugars.forEach((sugar, idx) => {
        const sc = sugar.sugarContent / 100;
        const invalid = sc <= 0;
        const mass = invalid ? 0 : (sugar.ratio / 100) * totalSugar / sc;
        const row = document.createElement('div');
        row.className = 'row sugar-row';
        row.innerHTML = `
            <div class="field">
                <label>糖的名称</label>
                <input type="text" data-idx="${idx}" data-field="name" value="${sugar.name}" placeholder="如：细砂糖">
            </div>
            <div class="field">
                <label>糖含量 (%)</label>
                <input type="number" data-idx="${idx}" data-field="sugarContent" value="${sugar.sugarContent}" min="0" max="100" step="0.5">
            </div>
            <div class="field">
                <label>占比 (%)</label>
                <input type="number" data-idx="${idx}" data-field="ratio" value="${sugar.ratio}" min="0" max="100" step="0.5">
            </div>
            <div class="field">
                <label>实际克重</label>
                <div class="row-result ${invalid ? 'invalid' : ''}">${invalid ? '糖含量>0' : fmt(mass, 1) + ' g'}</div>
            </div>
            <button class="btn-remove" data-action="remove-sugar" data-idx="${idx}" title="删除">×</button>
        `;
        container.appendChild(row);
    });

    // 自动平均分配按钮
    if (state.sugars.length >= 2) {
        const btn = document.createElement('button');
        btn.className = 'btn-add';
        btn.style.marginTop = '8px';
        btn.textContent = '⚖️ 平均分配占比';
        btn.addEventListener('click', () => {
            const avg = Math.round((100 / state.sugars.length) * 10) / 10;
            state.sugars.forEach(s => s.ratio = avg);
            renderSugars();
            renderSummary();
        });
        container.appendChild(btn);
    }
}

// 仅更新某一行糖的克重显示
function updateSugarRow(idx) {
    const sugar = state.sugars[idx];
    if (!sugar) return;
    const totalSugar = (state.sugarPercent / 100) * state.totalFlour;
    const sc = sugar.sugarContent / 100;
    const invalid = sc <= 0;
    const mass = invalid ? 0 : (sugar.ratio / 100) * totalSugar / sc;
    const row = $('sugar-list').children[idx];
    if (!row) return;
    const resultEl = row.querySelector('.row-result');
    if (!resultEl) return;
    resultEl.textContent = invalid ? '糖含量>0' : fmt(mass, 1) + ' g';
    resultEl.classList.toggle('invalid', invalid);
}

// ============== 渲染：附加材料 ==============

function renderExtras() {
    const container = $('extras-list');
    container.innerHTML = '';

    state.extras.forEach((extra, idx) => {
        const mass = (extra.percent / 100) * state.totalFlour;
        const row = document.createElement('div');
        row.className = 'row extra-row';
        row.innerHTML = `
            <div class="field">
                <label>材料名称</label>
                <input type="text" data-idx="${idx}" data-field="name" value="${extra.name}" placeholder="如：黄油">
            </div>
            <div class="field">
                <label>百分比 (% 占面粉)</label>
                <input type="number" data-idx="${idx}" data-field="percent" value="${extra.percent}" min="0" max="200" step="0.1">
            </div>
            <div class="field">
                <label>实际克重</label>
                <div class="row-result">${fmt(mass, 1)} g</div>
            </div>
            <button class="btn-remove" data-action="remove-extra" data-idx="${idx}" title="删除">×</button>
        `;
        container.appendChild(row);
    });
}

// 仅更新某一行附加材料的克重显示
function updateExtraRow(idx) {
    const extra = state.extras[idx];
    if (!extra) return;
    const mass = (extra.percent / 100) * state.totalFlour;
    const row = $('extras-list').children[idx];
    if (!row) return;
    const resultEl = row.querySelector('.row-result');
    if (resultEl) resultEl.textContent = fmt(mass, 1) + ' g';
}

// ============== 渲染：总览 ==============

function renderSummary() {
    const tbody = $('summary-body');
    tbody.innerHTML = '';

    let total = 0;

    // 面粉
    const flourMasses = calculateFlourMasses(state.flours, state.totalFlour, state.targetProtein);
    state.flours.forEach((f, idx) => {
        const mass = flourMasses[idx];
        const ratio = state.totalFlour > 0 ? (mass / state.totalFlour) * 100 : 0;
        total += mass;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>🌾 ${escapeHtml(f.name)}</td>
            <td>${fmt(ratio, 1)}% · 蛋白 ${fmt(f.protein, 1)}%</td>
            <td class="text-right">${fmt(mass, 1)} g</td>
        `;
        tbody.appendChild(tr);
    });

    // 实际蛋白质含量
    const totalFlourMass = flourMasses.reduce((s, m) => s + m, 0);
    const actualProtein = totalFlourMass > 0
        ? state.flours.reduce((s, f, i) => s + flourMasses[i] * f.protein, 0) / totalFlourMass
        : 0;
    const proteinMatch = Math.abs(actualProtein - state.targetProtein) < 0.05;
    // 2 种以上面粉且目标不在范围内时，无法精确达成
    const proteins = state.flours.map(f => f.protein);
    const targetOutOfRange = state.flours.length >= 2 && (state.targetProtein < Math.min(...proteins) || state.targetProtein > Math.max(...proteins));

    if (state.flours.length > 1 && !proteinMatch) {
        const tr = document.createElement('tr');
        tr.style.background = '#fef3c7';
        tr.innerHTML = `
            <td colspan="2" style="font-size:0.85rem;color:#92400e;">⚠️ 当前实际蛋白质 ${fmt(actualProtein, 2)}%，与目标 ${fmt(state.targetProtein, 1)}% 有偏差</td>
            <td class="text-right" style="color:#92400e;font-size:0.85rem;">—</td>
        `;
        tbody.appendChild(tr);
    }

    // 液体
    const totalWater = (state.hydration / 100) * state.totalFlour;
    state.liquids.forEach(l => {
        const wc = l.waterContent / 100;
        const mass = wc > 0 ? (l.ratio / 100) * totalWater / wc : 0;
        total += mass;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>💧 ${escapeHtml(l.name)}</td>
            <td>${fmt(l.ratio, 1)}% · 水含量 ${fmt(l.waterContent, 1)}%</td>
            <td class="text-right">${fmt(mass, 1)} g</td>
        `;
        tbody.appendChild(tr);
    });

    // 糖
    const sugarMasses = calculateSugarMasses(state.sugars, state.totalFlour, state.sugarPercent);
    state.sugars.forEach((sugar, idx) => {
        const mass = sugarMasses[idx];
        total += mass;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>🍯 ${escapeHtml(sugar.name)}</td>
            <td>${fmt(sugar.ratio, 1)}% · 糖含量 ${fmt(sugar.sugarContent, 1)}%</td>
            <td class="text-right">${fmt(mass, 1)} g</td>
        `;
        tbody.appendChild(tr);
    });

    // 附加材料
    state.extras.forEach(e => {
        const mass = (e.percent / 100) * state.totalFlour;
        total += mass;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>🧂 ${escapeHtml(e.name)}</td>
            <td>${fmt(e.percent, 1)}%</td>
            <td class="text-right">${fmt(mass, 1)} g</td>
        `;
        tbody.appendChild(tr);
    });

    $('grand-total').textContent = fmt(total, 1) + ' g';

    // 警告：含水率过高/过低
    const hw = $('hydration-warning');
    if (state.hydration > 90) {
        hw.textContent = '⚠️ 含水率过高（>90%），面团会过于粘稠不易操作';
        hw.classList.add('show');
    } else if (state.hydration < 50 && state.hydration > 0) {
        hw.textContent = '⚠️ 含水率较低（<50%），面团会比较干硬，适合饼干类';
        hw.classList.add('show');
    } else {
        hw.classList.remove('show');
    }

    // 警告：蛋白质偏差
    const pw = $('protein-warning');
    if (state.flours.length >= 2 && totalFlourMass > 0) {
        const proteins = state.flours.map(f => f.protein);
        const minP = Math.min(...proteins);
        const maxP = Math.max(...proteins);
        if (targetOutOfRange) {
            pw.textContent = `💡 目标蛋白质 ${fmt(state.targetProtein, 1)}% 超出现有面粉范围 [${fmt(minP, 1)}% ~ ${fmt(maxP, 1)}%]，已自动夹紧到边界`;
        } else if (state.flours.length >= 3 && !proteinMatch) {
            pw.textContent = `💡 3 种以上面粉时无法精确达成目标蛋白质，实际 ${fmt(actualProtein, 2)}%（目标 ${fmt(state.targetProtein, 1)}%）。可减少到 2 种面粉精确配比`;
        } else if (!proteinMatch) {
            pw.textContent = `💡 实际蛋白质 ${fmt(actualProtein, 2)}% ≠ 目标 ${fmt(state.targetProtein, 1)}%`;
        }
        if (!proteinMatch || targetOutOfRange) {
            pw.classList.add('show');
        } else {
            pw.classList.remove('show');
        }
    } else {
        pw.classList.remove('show');
    }
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

// ============== 事件绑定 ==============

function bindEvents() {
    // 总面粉重量 & 目标蛋白质
    $('flour-total').addEventListener('input', e => {
        state.totalFlour = Math.max(0, parseFloat(e.target.value) || 0);
        renderFlours();
        renderLiquids();
        renderSugars();
        renderExtras();
        renderSummary();
    });

    $('target-protein').addEventListener('input', e => {
        state.targetProtein = parseFloat(e.target.value) || 0;
        renderFlours();
        renderSummary();
    });

    $('hydration').addEventListener('input', e => {
        state.hydration = parseFloat(e.target.value) || 0;
        renderLiquids();
        renderSummary();
    });

    $('sugar-percent').addEventListener('input', e => {
        state.sugarPercent = parseFloat(e.target.value) || 0;
        renderSugars();
        renderSummary();
    });

    // 面粉 / 液体 / 糖 / 附加材料 列表的统一处理（事件委托）
    // 局部更新：只更新当前行的克重显示，避免重建 DOM 导致输入框失焦
    document.body.addEventListener('input', e => {
        const target = e.target;
        const idx = target.dataset.idx;
        const field = target.dataset.field;
        if (idx === undefined || !field) return;
        const value = target.type === 'number' ? (parseFloat(target.value) || 0) : target.value;

        if (target.closest('#flour-list')) {
            state.flours[+idx][field] = value;
            updateFlourRow(+idx);
            renderSummary();
        } else if (target.closest('#liquid-list')) {
            state.liquids[+idx][field] = value;
            updateLiquidRow(+idx);
            renderSummary();
        } else if (target.closest('#sugar-list')) {
            state.sugars[+idx][field] = value;
            updateSugarRow(+idx);
            renderSummary();
        } else if (target.closest('#extras-list')) {
            state.extras[+idx][field] = value;
            updateExtraRow(+idx);
            renderSummary();
        }
    });

    // 删除按钮
    document.body.addEventListener('click', e => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const idx = +btn.dataset.idx;
        if (action === 'remove-flour') {
            if (state.flours.length > 1) {
                state.flours.splice(idx, 1);
                renderFlours();
                renderSummary();
            } else {
                showToast('至少保留一种面粉');
            }
        } else if (action === 'remove-liquid') {
            if (state.liquids.length > 1) {
                state.liquids.splice(idx, 1);
                renderLiquids();
                renderSummary();
            } else {
                showToast('至少保留一种液体');
            }
        } else if (action === 'remove-sugar') {
            if (state.sugars.length > 1) {
                state.sugars.splice(idx, 1);
                renderSugars();
                renderSummary();
            } else {
                showToast('至少保留一种糖');
            }
        } else if (action === 'remove-extra') {
            state.extras.splice(idx, 1);
            renderExtras();
            renderSummary();
        }
    });

    // 添加按钮
    $('add-flour').addEventListener('click', () => {
        state.flours.push({ name: '新面粉', protein: 12 });
        renderFlours();
        renderSummary();
    });

    $('add-liquid').addEventListener('click', () => {
        state.liquids.push({ name: '新液体', waterContent: 100, ratio: 0 });
        renderLiquids();
        renderSummary();
    });

    $('add-sugar').addEventListener('click', () => {
        state.sugars.push({ name: '新糖类', sugarContent: 100, ratio: 0 });
        renderSugars();
        renderSummary();
    });

    $('add-extra').addEventListener('click', () => {
        state.extras.push({ name: '新材料', percent: 1 });
        renderExtras();
        renderSummary();
    });

    // 快捷模板
    document.querySelectorAll('[data-template]').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.dataset.template;
            const preset = FLOUR_PRESETS[key];
            if (!preset) return;
            state.flours = JSON.parse(JSON.stringify(preset.flours));
            state.targetProtein = preset.targetProtein;
            state.totalFlour = preset.totalFlour;
            $('flour-total').value = preset.totalFlour;
            $('target-protein').value = preset.targetProtein;
            renderFlours();
            renderSummary();
            showToast(`已加载「${preset.name}」配方模板`);
        });
    });

    document.querySelectorAll('[data-liquid]').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.dataset.liquid;
            const preset = LIQUID_PRESETS[key];
            if (!preset) return;
            state.liquids.push({ name: preset.name, waterContent: preset.waterContent, ratio: 0 });
            renderLiquids();
            renderSummary();
        });
    });

    document.querySelectorAll('[data-sugar]').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.dataset.sugar;
            const preset = SUGAR_PRESETS[key];
            if (!preset) return;
            const exists = state.sugars.some(s => s.name === preset.name);
            if (exists) {
                showToast(`「${preset.name}」已在列表中`);
                return;
            }
            state.sugars.push({ name: preset.name, sugarContent: preset.sugarContent, ratio: 0 });
            renderSugars();
            renderSummary();
        });
    });

    document.querySelectorAll('[data-extra]').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.dataset.extra;
            const preset = EXTRA_PRESETS[key];
            if (!preset) return;
            const exists = state.extras.some(e => e.name === preset.name);
            if (exists) {
                showToast(`「${preset.name}」已在列表中`);
                return;
            }
            state.extras.push({ name: preset.name, percent: preset.percent });
            renderExtras();
            renderSummary();
        });
    });

    // 操作按钮
    $('copy-btn').addEventListener('click', copyRecipe);
    $('download-btn').addEventListener('click', downloadRecipeImage);
    $('reset-btn').addEventListener('click', resetAll);
    $('scale-btn').addEventListener('click', () => {
        $('scale-panel').style.display = 'flex';
    });
    $('cancel-scale').addEventListener('click', () => {
        $('scale-panel').style.display = 'none';
    });
    $('apply-scale').addEventListener('click', () => {
        const factor = parseFloat($('scale-factor').value) || 1;
        if (factor <= 0) return showToast('倍数必须大于 0');
        state.totalFlour = Math.round(state.totalFlour * factor * 10) / 10;
        $('flour-total').value = state.totalFlour;
        $('scale-panel').style.display = 'none';
        renderFlours();
        renderLiquids();
        renderSugars();
        renderExtras();
        renderSummary();
        showToast(`已缩放 ${fmt(factor, 2)} 倍 · 总面粉 ${fmt(state.totalFlour, 1)} g`);
    });
}

// ============== 复制配方 ==============

function copyRecipe() {
    let text = '🍞 面包配方\n';
    text += '━━━━━━━━━━━━━━━━━━━━\n';
    text += `总面粉: ${fmt(state.totalFlour, 1)} g\n`;
    text += `目标蛋白质: ${fmt(state.targetProtein, 1)}%\n`;
    text += `含水率: ${fmt(state.hydration, 1)}%\n`;
    text += `糖含量: ${fmt(state.sugarPercent, 1)}%\n\n`;
    text += '【面粉】\n';
    const copyMasses = calculateFlourMasses(state.flours, state.totalFlour, state.targetProtein);
    state.flours.forEach((f, idx) => {
        const mass = copyMasses[idx];
        const ratio = state.totalFlour > 0 ? (mass / state.totalFlour) * 100 : 0;
        text += `  · ${f.name} (蛋白 ${fmt(f.protein,1)}%): ${fmt(mass, 1)} g (${fmt(ratio, 1)}%)\n`;
    });
    text += '\n【液体】\n';
    const totalWater = (state.hydration / 100) * state.totalFlour;
    state.liquids.forEach(l => {
        const wc = l.waterContent / 100;
        const mass = wc > 0 ? (l.ratio / 100) * totalWater / wc : 0;
        text += `  · ${l.name} (水含量 ${fmt(l.waterContent,1)}%): ${fmt(mass, 1)} g\n`;
    });
    text += '\n【糖】\n';
    const sugarCopyMasses = calculateSugarMasses(state.sugars, state.totalFlour, state.sugarPercent);
    state.sugars.forEach((sugar, idx) => {
        const mass = sugarCopyMasses[idx];
        text += `  · ${sugar.name} (糖含量 ${fmt(sugar.sugarContent,1)}%, 占比 ${fmt(sugar.ratio,1)}%): ${fmt(mass, 1)} g\n`;
    });
    text += '\n【附加材料】\n';
    state.extras.forEach(e => {
        const mass = (e.percent / 100) * state.totalFlour;
        text += `  · ${e.name}: ${fmt(mass, 1)} g (${fmt(e.percent, 1)}%)\n`;
    });
    text += `\n总重量: ${$('grand-total').textContent}\n`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
            () => showToast('✅ 配方已复制到剪贴板'),
            () => fallbackCopy(text)
        );
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand('copy');
        showToast('✅ 配方已复制');
    } catch (e) {
        showToast('❌ 复制失败');
    }
    document.body.removeChild(ta);
}

// ============== 下载配方图片 ==============

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

// 把 Canvas 文字绘制统一使用这个字体栈，避免中文回退到不支持的字体
function setFont(ctx, weight, size) {
    ctx.font = `${weight} ${size}px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif`;
}

function drawRecipeCanvas() {
    const W = 820;
    const PAD = 36;
    const SECTION_GAP = 20;
    const ITEM_H = 32;
    const TITLE_H = 30;
    const HEADER_H = 90;
    const META_H = 56;
    const FOOTER_H = 80;

    // 配色（与网站一致）
    const COLORS = {
        bg: '#faf6f0',
        card: '#ffffff',
        primary: '#8a5128',
        secondary: '#b8743a',
        light: '#e8b678',
        soft: '#f5ebd9',
        text: '#3d2817',
        textLight: '#7a6347',
        border: '#e8dcc4',
        white: '#ffffff'
    };

    // 计算所有分区的行
    const flourMasses = calculateFlourMasses(state.flours, state.totalFlour, state.targetProtein);
    const totalWater = (state.hydration / 100) * state.totalFlour;
    const liquidMasses = state.liquids.map(l => {
        const wc = l.waterContent / 100;
        return wc > 0 ? (l.ratio / 100) * totalWater / wc : 0;
    });
    const sugarMasses = calculateSugarMasses(state.sugars, state.totalFlour, state.sugarPercent);
    const extraMasses = state.extras.map(e => (e.percent / 100) * state.totalFlour);
    const totalWeight = [...flourMasses, ...liquidMasses, ...sugarMasses, ...extraMasses].reduce((a, b) => a + b, 0);

    // 计算图片高度
    let h = PAD * 2;
    h += HEADER_H;     // 标题
    h += META_H;       // 元信息
    h += SECTION_GAP;
    h += TITLE_H + state.flours.length * ITEM_H + SECTION_GAP;
    h += TITLE_H + state.liquids.length * ITEM_H + SECTION_GAP;
    h += TITLE_H + state.sugars.length * ITEM_H + SECTION_GAP;
    h += TITLE_H + state.extras.length * ITEM_H + SECTION_GAP;
    h += FOOTER_H;     // 总重量 + 底部签名

    // 创建高清 canvas（dpr=2 让图片更清晰）
    const dpr = 2;
    const canvas = document.createElement('canvas');
    canvas.width = W * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // 整体背景
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, h);

    // 卡片（白底）
    ctx.save();
    roundRect(ctx, PAD / 2, PAD / 2, W - PAD, h - PAD, 16);
    ctx.fillStyle = COLORS.card;
    ctx.fill();
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    let y = PAD + 18;

    // ===== 标题 =====
    setFont(ctx, 'bold', 32);
    ctx.fillStyle = COLORS.primary;
    ctx.textAlign = 'left';
    ctx.fillText('🍞 面包配方', PAD + 20, y + 28);

    // 右上角日期
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    setFont(ctx, 'normal', 13);
    ctx.fillStyle = COLORS.textLight;
    ctx.textAlign = 'right';
    ctx.fillText(dateStr, W - PAD - 20, y + 16);

    y += HEADER_H - 18;

    // ===== 元信息 =====
    roundRect(ctx, PAD + 20, y, W - PAD * 2 - 40, META_H - 8, 8);
    ctx.fillStyle = COLORS.soft;
    ctx.fill();

    setFont(ctx, 'normal', 14);
    ctx.fillStyle = COLORS.textLight;
    ctx.textAlign = 'left';
    const meta = [
        `总面粉 ${fmt(state.totalFlour, 0)}g`,
        `目标蛋白 ${fmt(state.targetProtein, 1)}%`,
        `含水率 ${fmt(state.hydration, 1)}%`,
        `含糖率 ${fmt(state.sugarPercent, 1)}%`
    ].join('   ·   ');
    ctx.fillText(meta, PAD + 32, y + 28);

    y += META_H;

    // ===== 分区 =====
    function drawSection(emoji, title, items) {
        // 左侧色块 + 标题
        ctx.fillStyle = COLORS.secondary;
        ctx.fillRect(PAD + 20, y + 4, 4, 22);

        setFont(ctx, 'bold', 18);
        ctx.fillStyle = COLORS.primary;
        ctx.textAlign = 'left';
        ctx.fillText(`${emoji} ${title}`, PAD + 32, y + 22);

        y += TITLE_H;

        // 条目
        items.forEach(item => {
            // 名称（左侧）
            setFont(ctx, 'normal', 15);
            ctx.fillStyle = COLORS.text;
            ctx.textAlign = 'left';
            ctx.fillText('· ' + item.name, PAD + 32, y + 18);

            // 副信息（中间）
            setFont(ctx, 'normal', 12);
            ctx.fillStyle = COLORS.textLight;
            ctx.fillText(item.sub, PAD + 260, y + 18);

            // 克重（右侧）
            setFont(ctx, 'bold', 16);
            ctx.fillStyle = COLORS.secondary;
            ctx.textAlign = 'right';
            ctx.fillText(item.mass, W - PAD - 20, y + 18);

            y += ITEM_H;
        });

        y += SECTION_GAP;
    }

    drawSection('🌾', '面粉', state.flours.map((f, i) => {
        const mass = flourMasses[i];
        const ratio = state.totalFlour > 0 ? (mass / state.totalFlour) * 100 : 0;
        return {
            name: f.name,
            sub: `占比 ${fmt(ratio, 1)}% · 蛋白 ${fmt(f.protein, 1)}%`,
            mass: `${fmt(mass, 1)} g`
        };
    }));

    drawSection('💧', '液体', state.liquids.map((l, i) => ({
        name: l.name,
        sub: `占比 ${fmt(l.ratio, 1)}% · 水含量 ${fmt(l.waterContent, 1)}%`,
        mass: `${fmt(liquidMasses[i], 1)} g`
    })));

    drawSection('🍯', '糖', state.sugars.map((s, i) => ({
        name: s.name,
        sub: `占比 ${fmt(s.ratio, 1)}% · 糖含量 ${fmt(s.sugarContent, 1)}%`,
        mass: `${fmt(sugarMasses[i], 1)} g`
    })));

    drawSection('🧂', '附加材料', state.extras.map((e, i) => ({
        name: e.name,
        sub: `${fmt(e.percent, 1)}% 占面粉`,
        mass: `${fmt(extraMasses[i], 1)} g`
    })));

    // ===== 总重量条 =====
    ctx.save();
    roundRect(ctx, PAD + 20, y, W - PAD * 2 - 40, 56, 8);
    ctx.fillStyle = COLORS.primary;
    ctx.fill();
    ctx.restore();

    setFont(ctx, 'normal', 16);
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = 'left';
    ctx.fillText('总重量', PAD + 36, y + 24);

    setFont(ctx, 'normal', 13);
    ctx.fillStyle = '#f5e0c4';
    ctx.textAlign = 'left';
    ctx.fillText(`${state.flours.length} 种面粉 · ${state.liquids.length} 种液体 · ${state.sugars.length} 种糖 · ${state.extras.length} 种附加`, PAD + 36, y + 44);

    setFont(ctx, 'bold', 26);
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = 'right';
    ctx.fillText(`${fmt(totalWeight, 1)} g`, W - PAD - 36, y + 32);

    y += FOOTER_H;

    // 底部签名
    setFont(ctx, 'normal', 11);
    ctx.fillStyle = COLORS.textLight;
    ctx.textAlign = 'center';
    ctx.fillText('🍞 面包配方计算器  ·  BreadMaker', W / 2, y - 8);

    return canvas;
}

function downloadRecipeImage() {
    let canvas;
    try {
        showToast('🎨 正在生成图片…');
        canvas = drawRecipeCanvas();
    } catch (err) {
        console.error('[Download] Canvas 绘制失败:', err);
        showToast('❌ 图片生成失败：' + err.message);
        return;
    }

    if (!canvas) {
        showToast('❌ Canvas 未创建');
        return;
    }

    const ts = new Date().toISOString().slice(0, 10);
    const filename = `面包配方_${ts}.png`;

    let dataUrl;
    try {
        dataUrl = canvas.toDataURL('image/png');
    } catch (err) {
        console.error('[Download] toDataURL 失败:', err);
        showToast('❌ 图片转换失败：' + err.message);
        return;
    }

    // 显示图片预览弹窗（同时触发下载）
    showImagePreview(dataUrl, filename);
}

function showImagePreview(dataUrl, filename) {
    // 移除已有弹窗
    const existing = document.getElementById('image-preview-modal');
    if (existing) existing.remove();

    // 创建弹窗
    const modal = document.createElement('div');
    modal.id = 'image-preview-modal';
    modal.innerHTML = `
        <div class="preview-backdrop"></div>
        <div class="preview-dialog">
            <div class="preview-header">
                <span>🍞 配方图片预览</span>
                <button class="preview-close" type="button" aria-label="关闭">×</button>
            </div>
            <div class="preview-body">
                <img src="${dataUrl}" alt="${filename}" id="preview-img">
            </div>
            <div class="preview-footer">
                <span class="preview-hint">💡 提示：右键图片可"图片存储为…"，或点击下方按钮下载</span>
                <div class="preview-actions">
                    <button class="btn-action" id="preview-cancel" type="button">关闭</button>
                    <button class="btn-action primary" id="preview-download" type="button">⬇️ 下载 PNG</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // 关闭逻辑
    const close = () => modal.remove();
    modal.querySelector('.preview-close').addEventListener('click', close);
    modal.querySelector('#preview-cancel').addEventListener('click', close);
    modal.querySelector('.preview-backdrop').addEventListener('click', close);

    // 下载按钮：用三种方法依次尝试
    modal.querySelector('#preview-download').addEventListener('click', () => {
        const ok = tryDownload(dataUrl, filename);
        if (ok) {
            showToast('✅ 下载已触发：' + filename);
        }
    });
}

function tryDownload(dataUrl, filename) {
    // 方法 1：标准 <a download> 方式
    try {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            if (a.parentNode) a.parentNode.removeChild(a);
        }, 100);
        return true;
    } catch (e1) {
        console.warn('[Download] 方法1失败:', e1);
    }

    // 方法 2：window.open 打开新标签
    try {
        const win = window.open(dataUrl, '_blank');
        if (win) return true;
    } catch (e2) {
        console.warn('[Download] 方法2失败:', e2);
    }

    // 方法 3：location.href
    try {
        window.location.href = dataUrl;
        return true;
    } catch (e3) {
        console.warn('[Download] 方法3失败:', e3);
    }

    showToast('❌ 下载失败，请右键图片手动保存');
    return false;
}

// ============== 重置 ==============

function resetAll() {
    if (!confirm('确定要重置所有数据吗？')) return;
    state.flours = [
        { name: '高筋面粉', protein: 13.5 }
    ];
    state.targetProtein = 13.5;
    state.totalFlour = 500;
    state.hydration = 65;
    state.liquids = [
        { name: '水', waterContent: 100, ratio: 100 }
    ];
    state.sugarPercent = 8;
    state.sugars = [
        { name: '细砂糖', sugarContent: 100, ratio: 100 }
    ];
    state.extras = [
        { name: '盐', percent: 2 }
    ];
    $('flour-total').value = 500;
    $('target-protein').value = 13.5;
    $('hydration').value = 65;
    $('sugar-percent').value = 8;
    renderFlours();
    renderLiquids();
    renderSugars();
    renderExtras();
    renderSummary();
    showToast('🔄 已重置');
}

// ============== 初始化 ==============

function init() {
    $('flour-total').value = state.totalFlour;
    $('target-protein').value = state.targetProtein;
    $('hydration').value = state.hydration;
    $('sugar-percent').value = state.sugarPercent;
    bindEvents();
    renderFlours();
    renderLiquids();
    renderSugars();
    renderExtras();
    renderSummary();
}

document.addEventListener('DOMContentLoaded', init);

// 全局错误捕获：在 toast 中显示未处理的错误，方便调试
window.addEventListener('error', e => {
    console.error('Global error:', e.error);
    if (typeof showToast === 'function') {
        showToast('❌ 错误：' + (e.error?.message || e.message));
    }
});
window.addEventListener('unhandledrejection', e => {
    console.error('Unhandled rejection:', e.reason);
    if (typeof showToast === 'function') {
        showToast('❌ 异常：' + (e.reason?.message || e.reason));
    }
});
