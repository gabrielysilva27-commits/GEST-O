import fs from 'node:fs/promises';

async function patch(path, transform) {
  const source = await fs.readFile(path, 'utf8');
  const next = transform(source);
  if (next !== source) await fs.writeFile(path, next);
}

await patch('assets/js/modules/index.js', (initial) => {
  if (initial.includes('// ACTIONS_LAZY_RENDER_V1')) return initial;
  let source = initial;

  const oldRegisteredUserName = `function registeredUserName(lookups, id, fallbackName = "") {
  const users = lookups?.users || [];
  const byId = users.find((user) => String(user.id) === String(id));
  if (byId) return byId.name;
  const fallbackKey = actionPersonKey(fallbackName);
  const matchingUser = users.find((user) => actionPersonKey(user.name) === fallbackKey || actionPersonKey(user.username) === fallbackKey);
  if (matchingUser) return matchingUser.name;
  const firstName = fallbackKey.split(" ")[0];
  const sameFirstName = users.filter((user) => actionPersonKey(user.name).split(" ")[0] === firstName);
  return sameFirstName.length === 1 ? sameFirstName[0].name : String(fallbackName || "Não informado").trim();
}`;

  const newRegisteredUserName = `const actionUserIndexCache = new WeakMap();

function getActionUserIndex(users) {
  if (!Array.isArray(users) || users.length === 0) return { byId: new Map(), byIdentity: new Map(), uniqueFirstName: new Map() };
  const cached = actionUserIndexCache.get(users);
  if (cached) return cached;
  const byId = new Map();
  const byIdentity = new Map();
  const firstNameCounts = new Map();
  const firstNameLabels = new Map();
  users.forEach((user) => {
    const label = String(user.name || user.username || "").trim();
    byId.set(String(user.id), label);
    [user.name, user.username].forEach((value) => {
      const key = actionPersonKey(value);
      if (key && !byIdentity.has(key)) byIdentity.set(key, label);
    });
    const firstName = actionPersonKey(user.name).split(" ")[0];
    if (firstName) {
      firstNameCounts.set(firstName, (firstNameCounts.get(firstName) || 0) + 1);
      firstNameLabels.set(firstName, label);
    }
  });
  const uniqueFirstName = new Map([...firstNameLabels].filter(([key]) => firstNameCounts.get(key) === 1));
  const index = { byId, byIdentity, uniqueFirstName };
  actionUserIndexCache.set(users, index);
  return index;
}

function registeredUserName(lookups, id, fallbackName = "") {
  const users = lookups?.users || [];
  const index = getActionUserIndex(users);
  const byId = index.byId.get(String(id));
  if (byId) return byId;
  const fallbackKey = actionPersonKey(fallbackName);
  const exact = index.byIdentity.get(fallbackKey);
  if (exact) return exact;
  const firstName = fallbackKey.split(" ")[0];
  return index.uniqueFirstName.get(firstName) || String(fallbackName || "Não informado").trim();
}`;

  if (!source.includes(oldRegisteredUserName)) throw new Error('Função de resolução de usuário das ações não encontrada');
  source = source.replace(oldRegisteredUserName, newRegisteredUserName);

  const actionViewPattern = /function actionPlansView\(data, context\) \{[\s\S]*?\n\}\n\nfunction meetingHistoryView/;
  if (!actionViewPattern.test(source)) throw new Error('actionPlansView não encontrada');

  const newActionView = `// ACTIONS_LAZY_RENDER_V1
function actionCanManageRequested(item, context) {
  if (context.user?.role === "admin") return true;
  const id = toInt(context.user?.id);
  if ([toInt(item.createdBy), toInt(item.requesterId), toInt(item.ownerId)].includes(id)) return true;
  const identities = [context.user?.name, context.user?.username, context.user?.title].map(actionPersonKey);
  return [item.requesterName, item.legacyRequesterName, item.legacyOwnerName]
    .map(actionPersonKey)
    .some((name) => name && identities.includes(name));
}

export function actionFilterRecord(item, context) {
  const requester = registeredUserName(context.lookups, item.requesterId, item.requesterName || item.legacyRequesterName);
  const owner = registeredUserName(context.lookups, item.ownerId, item.legacyOwnerName);
  return {
    item,
    subject: actionSubjectKey(canonicalActionSubject(item.meetingSubject || item.title)),
    meeting: String(item.meetingTitle || ""),
    requester: actionPersonKey(requester),
    owner: actionPersonKey(owner),
    executionMonth: executionMonthKey(item.meetingExecutionDate || item.createdAt),
    status: String(item.status || "open")
  };
}

function actionRowHtml(item, context) {
  const requester = registeredUserName(context.lookups, item.requesterId, item.requesterName || item.legacyRequesterName);
  const owner = registeredUserName(context.lookups, item.ownerId, item.legacyOwnerName);
  const canComplete = toInt(item.ownerId) === toInt(context.user?.id) && item.status !== "done";
  const statusCell = \`${'${actionStatusBadge(item.status || "open")}'}${'${canComplete ? ` <button class="button secondary action-complete-button" type="button" data-complete-action="${escapeHtml(item.id)}">Concluir</button>` : ""}'}\`;
  const ownerActions = actionCanManageRequested(item, context)
    ? \`<button class="gerot-icon-button" type="button" data-edit-owned-action="${'${escapeHtml(item.id)}'}" aria-label="Editar ação" title="Editar ação">✎</button><button class="gerot-icon-button danger" type="button" data-delete-owned-action="${'${escapeHtml(item.id)}'}" aria-label="Excluir ação" title="Excluir ação">🗑</button>\`
    : "";
  const attachment = item.attachment?.data
    ? \`<a class="button ghost attachment-link" href="${'${escapeHtml(item.attachment.data)}'}" download="${'${escapeHtml(item.attachment.name || "documento")}'}" target="_blank" rel="noopener">Ver anexo</a>\`
    : '<span class="text-muted">Sem anexo</span>';
  return \`<tr data-action-row>
    <td class="action-date-cell" data-label="Data">${'${escapeHtml(formatDate(item.meetingExecutionDate || item.createdAt))}'}</td>
    <td data-label="Reunião">${'${escapeHtml(item.meetingTitle || "Não vinculada")}'}</td>
    <td data-label="Assunto">${'${escapeHtml(item.meetingSubject || item.title)}'}</td>
    <td class="action-plan-cell" data-label="Plano de ação">${'${escapeHtml(item.objective || item.title)}'}</td>
    <td data-label="Solicitante">${'${escapeHtml(requester)}'}</td>
    <td data-label="Responsável">${'${escapeHtml(owner)}'}</td>
    <td data-label="Prioridade">${'${statusBadge(item.priority || "medium")}'}</td>
    <td data-label="Status">${'${statusCell}'}</td>
    <td data-label="Anexo">${'${attachment}'}</td>
    <td class="action-owner-actions" data-label="Ações">${'${ownerActions}'}</td>
  </tr>\`;
}

export function renderActionRows(items, context) {
  return arrayValue(items).map((item) => actionRowHtml(item, context)).join("");
}

function actionPlansView(data, context) {
  const items = data.items || [];
  const meetings = data.meetings?.items || [];
  const canCreate = userCan(context, "meetings.manage") && userCan(context, "actionPlans.manage");

  if (context.actionWorkspace === "create") {
    const formContent = data.meetings
      ? (canCreate ? actionCreationForm(meetings, context) : dependencyNotice("Acesso somente para consulta", "Seu perfil não pode abrir novas ações."))
      : dependencyNotice("Carregando reuniões", "Preparando os cadastros necessários para abrir a nova ação.");
    return \`
      <section class="action-subview">
        <header class="action-workspace-header">
          <div><p class="eyebrow">Ações</p><h2>Nova ação</h2><p>Vincule a ação à reunião e selecione um assunto cadastrado.</p></div>
          <button class="button secondary" type="button" data-close-action-form>Voltar para ações</button>
        </header>
        ${'${formCard("Dados da ação", "O solicitante é preenchido conforme o usuário conectado.", formContent)}'}
      </section>
    \`;
  }

  return \`
    <section class="action-workspace">
      <header class="action-workspace-header">
        <div><p class="eyebrow">Acompanhamento operacional</p><h2>Carteira de ações</h2><p>Consulte, filtre e acompanhe as ações vinculadas às reuniões.</p></div>
        ${'${canCreate ? \'<button class="button primary" type="button" data-open-action-form>Nova ação</button>\' : ""}'}
      </header>
      <section class="action-filter-card">
        <div class="action-filter-heading"><strong>Filtros</strong><button class="button ghost" type="button" data-clear-action-filters>Limpar filtros</button></div>
        <div class="action-filter-grid" data-action-filters>
          <label class="field"><span>Assunto</span><select data-action-filter="subject"><option value="">Selecionar</option>${'${actionSubjectOptions(items)}'}</select></label>
          <label class="field"><span>Reunião</span><select data-action-filter="meeting"><option value="">Selecionar</option>${'${actionFilterOptions(items, (item) => item.meetingTitle)}'}</select></label>
          <label class="field"><span>Solicitante</span><select data-action-filter="requester"><option value="">Selecionar</option>${'${actionPersonOptions(items, (item) => registeredUserName(context.lookups, item.requesterId, item.requesterName || item.legacyRequesterName))}'}</select></label>
          <label class="field"><span>Responsável</span><select data-action-filter="owner"><option value="">Selecionar</option>${'${actionPersonOptions(items, (item) => registeredUserName(context.lookups, item.ownerId, item.legacyOwnerName))}'}</select></label>
          <label class="field"><span>Status</span><select data-action-filter="status"><option value="">Selecionar</option><option value="overdue">Atrasado</option><option value="in_progress">Em andamento</option><option value="done">Concluído</option></select></label>
          <label class="field"><span>Data de execução</span><select data-action-filter="executionMonth"><option value="">Selecionar</option>${'${executionMonthOptions(items)}'}</select></label>
        </div>
        <p class="action-filter-result" data-action-filter-result>Selecione ao menos um filtro para ver as ações.</p>
      </section>
      <section class="table-card action-portfolio-card" data-action-portfolio>
        ${'${items.length ? `<div class="table-scroll"><table class="action-table"><colgroup><col class="action-date-column"><col class="action-meeting-column"><col class="action-subject-column"><col class="action-plan-column"><col class="action-requester-column"><col class="action-owner-column"><col class="action-priority-column"><col class="action-status-column"><col class="action-attachment-column"><col class="action-owner-actions-column"></colgroup><thead><tr><th>Data</th><th>Reunião</th><th>Assunto</th><th>Plano de ação</th><th>Solicitante</th><th>Responsável</th><th>Prioridade</th><th>Status</th><th>Anexo</th><th aria-label="Ações"></th></tr></thead><tbody data-action-results-body></tbody></table></div><div class="form-actions" data-action-pagination hidden><button class="button secondary" type="button" data-action-page="prev">Anterior</button><span class="text-muted" data-action-page-info></span><button class="button secondary" type="button" data-action-page="next">Próxima</button></div>` : \'<div class="empty-state"><div><h2>Sem ações</h2><p>As novas ações abertas nas reuniões aparecerão aqui.</p></div></div>\'}'}
      </section>
    </section>
  \`;
}

function meetingHistoryView`;

  source = source.replace(actionViewPattern, newActionView);

  const oldLoader = `  actionPlans: {
    title: "Ações",
    load: async (api, token) => {
      const [actions, meetings] = await Promise.all([
        api.list(token, "/action-plans"),
        api.list(token, "/meetings")
      ]);
      return { ...actions, meetings };
    },
    render: (data, context) => actionPlansView(data, context)
  },`;
  const newLoader = `  actionPlans: {
    title: "Ações",
    load: async (api, token, context) => {
      const actions = await api.list(token, "/action-plans");
      if (context?.actionWorkspace !== "create") return actions;
      const meetings = await api.list(token, "/meetings");
      return { ...actions, meetings };
    },
    render: (data, context) => actionPlansView(data, context)
  },`;
  if (!source.includes(oldLoader)) throw new Error('Loader do módulo Ações não encontrado');
  source = source.replace(oldLoader, newLoader);

  return source;
});

await patch('assets/js/app.js', (initial) => {
  if (initial.includes('// ACTIONS_LAZY_RENDER_V1')) return initial;
  let source = initial;

  const importBefore = 'import { applyDashboardFilters, gerotLivePreview, views } from "./modules/index.js?v=filters-20260905-08";';
  const importAfter = 'import { actionFilterRecord, applyDashboardFilters, gerotLivePreview, renderActionRows, views } from "./modules/index.js?v=filters-20260905-08";';
  if (!source.includes(importBefore)) throw new Error('Importação do módulo de views não encontrada');
  source = source.replace(importBefore, importAfter);

  const stateMarker = 'let activeViewLoad = 0;';
  if (!source.includes(stateMarker)) throw new Error('Marcador de estado da view não encontrado');
  source = source.replace(stateMarker, `${stateMarker}\n// ACTIONS_LAZY_RENDER_V1\nconst ACTION_FILTER_PAGE_SIZE = 100;\nlet actionFilterPage = 1;`);

  const loadBefore = 'view.load(viewId === "audit" ? auditApi : api, state.token)';
  const loadAfter = 'view.load(viewId === "audit" ? auditApi : api, state.token, state)';
  if (!source.includes(loadBefore)) throw new Error('Chamada de carregamento da view não encontrada');
  source = source.replace(loadBefore, loadAfter);

  const changeBefore = `  if (event.target.matches("[data-action-filter]")) {
    applyActionFilters();
  }`;
  const changeAfter = `  if (event.target.matches("[data-action-filter]")) {
    actionFilterPage = 1;
    applyActionFilters();
  }`;
  if (!source.includes(changeBefore)) throw new Error('Evento dos filtros de ações não encontrado');
  source = source.replace(changeBefore, changeAfter);

  const clickMarker = `  const clearActionFiltersButton = event.target.closest("[data-clear-action-filters]");`;
  if (!source.includes(clickMarker)) throw new Error('Marcador do botão de limpar filtros não encontrado');
  source = source.replace(clickMarker, `  const actionPageButton = event.target.closest("[data-action-page]");
  if (actionPageButton) {
    actionFilterPage += actionPageButton.dataset.actionPage === "next" ? 1 : -1;
    applyActionFilters();
    return;
  }

${clickMarker}`);

  const filterPattern = /function applyActionFilters\(\) \{[\s\S]*?\n\}\n\nfunction clearActionFilters\(\) \{/;
  if (!filterPattern.test(source)) throw new Error('applyActionFilters não encontrada');
  const newFilter = `function applyActionFilters() {
  const filterRoot = elements.pageContent.querySelector("[data-action-filters]");
  const body = elements.pageContent.querySelector("[data-action-results-body]");
  if (!filterRoot || !body) return;

  const filters = Object.fromEntries(
    [...filterRoot.querySelectorAll("[data-action-filter]")].map((field) => [field.dataset.actionFilter, normalizeFilterValue(field.value)])
  );
  const hasFilters = Object.values(filters).some(Boolean);
  const output = elements.pageContent.querySelector("[data-action-filter-result]");
  const pagination = elements.pageContent.querySelector("[data-action-pagination]");
  const pageInfo = elements.pageContent.querySelector("[data-action-page-info]");
  const prev = elements.pageContent.querySelector('[data-action-page="prev"]');
  const next = elements.pageContent.querySelector('[data-action-page="next"]');

  if (!hasFilters) {
    body.replaceChildren();
    actionFilterPage = 1;
    if (pagination) pagination.hidden = true;
    if (output) output.textContent = "Selecione ao menos um filtro para ver as ações.";
    return;
  }

  const items = state.dataCache.actionPlans?.items || [];
  const matches = [];
  for (const item of items) {
    const row = actionFilterRecord(item, state);
    const matchesFilters =
      (!filters.subject || normalizeActionSubject(row.subject) === normalizeActionSubject(filters.subject)) &&
      (!filters.meeting || normalizeFilterValue(row.meeting) === filters.meeting) &&
      (!filters.requester || normalizeFilterValue(row.requester) === filters.requester) &&
      (!filters.owner || normalizeFilterValue(row.owner) === filters.owner) &&
      (!filters.status || row.status === filters.status) &&
      (!filters.executionMonth || row.executionMonth === filters.executionMonth);
    if (matchesFilters) matches.push(item);
  }

  const totalPages = Math.max(1, Math.ceil(matches.length / ACTION_FILTER_PAGE_SIZE));
  actionFilterPage = Math.max(1, Math.min(actionFilterPage, totalPages));
  const start = (actionFilterPage - 1) * ACTION_FILTER_PAGE_SIZE;
  const pageItems = matches.slice(start, start + ACTION_FILTER_PAGE_SIZE);
  body.innerHTML = renderActionRows(pageItems, state);

  if (output) {
    const end = Math.min(start + pageItems.length, matches.length);
    output.textContent = matches.length
      ? \`${'${matches.length} ${matches.length === 1 ? "ação encontrada" : "ações encontradas"} · exibindo ${start + 1}-${end}'}\`
      : "Nenhuma ação encontrada com esses filtros.";
  }
  if (pagination) pagination.hidden = matches.length <= ACTION_FILTER_PAGE_SIZE;
  if (pageInfo) pageInfo.textContent = \`Página ${'${actionFilterPage}'} de ${'${totalPages}'}\`;
  if (prev) prev.disabled = actionFilterPage <= 1;
  if (next) next.disabled = actionFilterPage >= totalPages;
}

function clearActionFilters() {`;
  source = source.replace(filterPattern, newFilter);

  const clearBefore = `  filterRoot.querySelectorAll("[data-action-filter]").forEach((field) => {
    field.value = "";
  });
  applyActionFilters();`;
  const clearAfter = `  filterRoot.querySelectorAll("[data-action-filter]").forEach((field) => {
    field.value = "";
  });
  actionFilterPage = 1;
  applyActionFilters();`;
  if (!source.includes(clearBefore)) throw new Error('Limpeza dos filtros de ações não encontrada');
  source = source.replace(clearBefore, clearAfter);

  return source;
});

console.log('Módulo Ações otimizado com renderização sob demanda e carregamento preguiçoso.');
