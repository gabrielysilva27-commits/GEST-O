const MODULE_LABELS = {
  dashboard: "Dashboard",
  audit: "Painel de auditoria",
  administration: "Administração",
  actionPlans: "Ações",
  meetings: "Reuniões",
  gapa: "GAPA",
  dto: "DTO - Diagnóstico de tarefa operacional",
  anomalyReports: "Relato de anomalia",
  gerot: "GEROT",
  users: "Usuários e permissões",
  notifications: "Notificações",
  history: "Histórico"
};

const VALUE_LABELS = {
  open: "Aberto",
  in_progress: "Em andamento",
  done: "Concluído",
  scheduled: "Agendada",
  held: "Realizada",
  follow_up: "Follow-up",
  analysis: "Em diagnóstico",
  completed: "Concluído",
  resolved: "Resolvido",
  closed: "Encerrado",
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica"
};

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}

function badgeClass(value = "") {
  return String(value).toLowerCase().replaceAll(" ", "_");
}

function optionList(items, selectedValue = "", labelKey = "name") {
  return items
    .map((item) => {
      const label = item[labelKey] || item.name || item.label || item.username || item.id;
      const selected = String(item.id) === String(selectedValue) ? "selected" : "";
      return `<option value="${escapeHtml(item.id)}" ${selected}>${escapeHtml(label)}</option>`;
    })
    .join("");
}

function jsonAttribute(value) {
  return escapeHtml(JSON.stringify(value || []));
}

function valueOptions(items, selectedValue = "") {
  return items
    .map((item) => {
      const selected = item === selectedValue ? "selected" : "";
      return `<option value="${escapeHtml(item)}" ${selected}>${escapeHtml(item)}</option>`;
    })
    .join("");
}

function formatDate(value) {
  if (!value) {
    return "Sem data";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const hasTime = typeof value === "string" && value.includes("T");
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: hasTime ? "short" : undefined
  }).format(date);
}

function formatValueLabel(value = "") {
  return VALUE_LABELS[value] || String(value).replaceAll("_", " ");
}

function moduleLabel(value = "") {
  return MODULE_LABELS[value] || value;
}

function moduleHeader() {
  return "";
}

function metricCards(cards) {
  return `
    <section class="stats-grid">
      ${cards.map((card) => `
        <article class="metric-card">
          <span class="eyebrow">${escapeHtml(card.label)}</span>
          <strong>${escapeHtml(card.value)}</strong>
          <p>${escapeHtml(card.helper || "")}</p>
        </article>
      `).join("")}
    </section>
  `;
}

function progressList(title, description, items, formatter = (item) => item.value) {
  return `
    <article class="chart-card">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(description)}</p>
      <ul>
        ${items.map((item) => {
          const progress = Math.max(4, Math.min(100, Number(item.progress ?? item.value) || 0));
          return `
            <li>
              <div class="row">
                <strong>${escapeHtml(item.label)}</strong>
                <span>${escapeHtml(formatter(item))}</span>
              </div>
              <div class="bar-track">
                <div class="bar-fill" style="width: ${progress}%"></div>
              </div>
            </li>
          `;
        }).join("")}
      </ul>
    </article>
  `;
}

function tableCard(title, description, headers, rows) {
  return `
    <section class="table-card">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(description)}</p>
      ${rows.length === 0 ? `
        <div class="empty-state">
          <div>
            <h2>Sem registros</h2>
            <p>Novos itens aparecerão aqui conforme você começar a usar este módulo.</p>
          </div>
        </div>
      ` : `
        <div class="table-scroll">
          <table>
            <thead>
              <tr>${headers.map((header) => `<th scope="col">${escapeHtml(header)}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}
            </tbody>
          </table>
        </div>
      `}
    </section>
  `;
}

function formCard(title, description, content) {
  return `
    <section class="panel-card">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(description)}</p>
      ${content}
    </section>
  `;
}

function timelineCard(title, description, items) {
  return `
    <section class="timeline">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(description)}</p>
      ${items.length === 0 ? `
        <div class="empty-state">
          <div>
            <h2>Nenhum evento ainda</h2>
            <p>O histórico começará a aparecer conforme novos registros forem criados.</p>
          </div>
        </div>
      ` : `
        <ol>
          ${items.map((item) => `
            <li>
              <strong>${escapeHtml(item.description || item.title || "Registro")}</strong>
              ${item.module ? `<span class="badge info">${escapeHtml(moduleLabel(item.module))}</span>` : ""}
              <time datetime="${escapeHtml(item.createdAt || "")}">${escapeHtml(formatDate(item.createdAt))}</time>
            </li>
          `).join("")}
        </ol>
      `}
    </section>
  `;
}

function getLookupName(lookups, type, id) {
  const list = lookups?.[type] || [];
  const item = list.find((entry) => String(entry.id) === String(id));
  return item ? item.name : "Não definido";
}

function getUserLabel(lookups, id, fallbackName = "") {
  const user = (lookups?.users || []).find((entry) => String(entry.id) === String(id));
  return user ? `${user.name} · @${user.username}` : fallbackName || "Não definido";
}

function dependencyNotice(title, message) {
  return `
    <div class="empty-state">
      <div>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(message)}</p>
      </div>
    </div>
  `;
}

function getDependencyState(context, { requiresUnits = false, requiresUsers = false } = {}) {
  const units = context.lookups?.units || [];
  const users = context.lookups?.users || [];

  if (requiresUnits && units.length === 0) {
    return dependencyNotice(
      "Cadastros complementares pendentes",
      "Este módulo precisa de unidades cadastradas na base antes de receber novos registros."
    );
  }

  if (requiresUsers && users.length === 0) {
    return dependencyNotice(
      "Cadastros complementares pendentes",
      "Este módulo precisa de usuários cadastrados antes de receber novos registros."
    );
  }

  return "";
}

function userCan(context, permission) {
  return (context.user?.permissions || []).includes(permission);
}

function statusBadge(value) {
  return `<span class="badge ${badgeClass(value)}">${escapeHtml(formatValueLabel(value))}</span>`;
}

function actionStatusBadge(value = "open") {
  const labels = {
    open: "Parado",
    in_progress: "Em andamento",
    done: "Concluído"
  };
  return `<span class="badge ${badgeClass(value)}">${escapeHtml(labels[value] || formatValueLabel(value))}</span>`;
}

function dashboardView(data) {
  const overdueRows = (data.highlights?.overdueItems || []).map((item) => [
    escapeHtml(item.title),
    `<span class="badge info">${escapeHtml(item.module)}</span>`,
    escapeHtml(formatDate(item.dueDate)),
    statusBadge(item.status || "open")
  ]);

  const anomalyRows = (data.highlights?.priorityAnomalies || []).map((item) => [
    escapeHtml(item.title),
    escapeHtml(item.unitName || "Não definida"),
    statusBadge(item.severity || "high"),
    statusBadge(item.status || "open")
  ]);

  return `
    ${moduleHeader("Dashboard operacional", "Acompanhe rapidamente o ritmo dos principais módulos da operação.")}
    ${metricCards(data.kpis || [])}
    <div class="charts-grid">
      ${progressList("Ações", "Leitura do andamento por status.", data.charts?.actionPlansByStatus || [], (item) => `${item.value} registros`)}
      ${progressList("Reuniões", "Agenda e desdobramentos do período.", data.charts?.meetingsByStatus || [], (item) => `${item.value} registros`)}
      ${progressList("Carga por módulo", "Volume atual nos módulos mais operacionais.", data.charts?.moduleLoad || [], (item) => `${item.value} registros`)}
      ${timelineCard("Histórico recente", "Últimos movimentos relevantes registrados na plataforma.", data.feed || [])}
    </div>
    <div class="split-layout">
      ${tableCard("Prazos em foco", "Itens vencidos ou que pedem atenção imediata.", ["Registro", "Módulo", "Prazo", "Status"], overdueRows)}
      ${tableCard("Anomalias prioritárias", "Relatos com severidade alta ou crítica ainda em aberto.", ["Relato", "Unidade", "Severidade", "Status"], anomalyRows)}
    </div>
  `;
}

function auditPanelView(data) {
  const dashboard = data.dashboard || {};
  const notifications = data.notifications || { items: [], unreadCount: 0 };
  const history = data.history || { items: [] };

  const cards = [
    {
      label: "Não lidas",
      value: notifications.unreadCount || 0,
      helper: "Notificações ainda pendentes"
    },
    {
      label: "Prazos vencidos",
      value: (dashboard.highlights?.overdueItems || []).length,
      helper: "Itens que pedem ação imediata"
    },
    {
      label: "Anomalias criticas",
      value: (dashboard.highlights?.priorityAnomalies || []).length,
      helper: "Ocorrencias de maior sensibilidade"
    },
    {
      label: "Movimentações",
      value: (history.items || []).length,
      helper: "Últimos registros monitorados"
    }
  ];

  const alertRows = (notifications.items || []).slice(0, 8).map((item) => [
    `<span class="badge ${badgeClass(item.level)}">${escapeHtml(item.title)}</span>`,
    escapeHtml(item.message),
    escapeHtml(formatDate(item.createdAt)),
    item.read ? "<span class=\"badge success\">Lida</span>" : "<span class=\"badge warning\">Pendente</span>"
  ]);

  const movementRows = (history.items || []).slice(0, 10).map((item) => [
    `<span class="badge info">${escapeHtml(moduleLabel(item.module))}</span>`,
    escapeHtml(item.description || ""),
    escapeHtml(formatDate(item.createdAt))
  ]);

  return `
    ${moduleHeader("Painel de auditoria", "Consolide alertas, prazos e movimentações recentes em uma leitura única.")}
    ${metricCards(cards)}
    <div class="split-layout">
      ${tableCard("Alertas recentes", "Visão rápida do que ainda merece acompanhamento.", ["Título", "Mensagem", "Quando", "Situação"], alertRows)}
      ${tableCard("Movimentações monitoradas", "Últimos registros relevantes para acompanhamento.", ["Módulo", "Descrição", "Quando"], movementRows)}
    </div>
    ${timelineCard("Rastro operacional", "Cronologia dos eventos mais recentes da plataforma.", history.items || [])}
  `;
}

function usersView(data, context) {
  const rows = (data.items || []).map((item) => [
    escapeHtml(item.name),
    escapeHtml(item.username),
    `<span class="badge info">${escapeHtml(item.roleLabel)}</span>`,
    `<span class="badge ${badgeClass(item.status || "active")}">${escapeHtml(item.status || "active")}</span>`
  ]);

  const roleOptions = context.lookups.roles.map((role) => `
    <option value="${escapeHtml(role.id)}">${escapeHtml(role.label)}</option>
  `).join("");

  const formContent = userCan(context, "users.manage")
    ? `
      <form class="stack" data-form="users">
        <div class="form-grid">
          <label class="field">
            <span>Nome</span>
            <input name="name" required>
          </label>
          <label class="field">
            <span>Nome de usuário</span>
            <input name="username" required>
          </label>
          <label class="field">
            <span>Perfil</span>
            <select name="role" required>${roleOptions}</select>
          </label>
          <label class="field">
            <span>Senha inicial</span>
            <input name="password" placeholder="Defina uma senha">
          </label>
        </div>
        <button class="button primary" type="submit">Cadastrar usuário</button>
      </form>
    `
    : dependencyNotice(
        "Acesso somente para consulta",
        "Seu perfil pode visualizar os usuários, mas não pode cadastrar novos acessos por aqui."
      );

  return `
    ${moduleHeader("Usuários e permissões", "Cadastre acessos, senhas iniciais e perfis diretamente pela plataforma.")}
    <div class="split-layout">
      ${tableCard("Usuários ativos", "Lista atual de acessos disponíveis.", ["Nome", "Usuário", "Perfil", "Status"], rows)}
      ${formCard("Novo usuário", "Crie um novo acesso com nome de usuário e senha inicial.", formContent)}
    </div>
  `;
}

function operationsView(config, data, context) {
  const rows = (data.items || []).map((item) => config.columns.map((column) => column(item, context)));
  const blocked = getDependencyState(context, config.dependencies);
  const formContent = blocked
    || (userCan(context, config.managePermission)
      ? config.form(context)
      : dependencyNotice(
          "Acesso somente para consulta",
          "Seu perfil pode visualizar este módulo, mas não pode criar registros por aqui."
        ));

  return `
    ${moduleHeader(config.title, config.description, config.actions || "")}
    <div class="split-layout">
      ${tableCard(config.tableTitle, config.tableDescription, config.headers, rows)}
      ${formCard(config.formTitle, config.formDescription, formContent)}
    </div>
  `;
}

function notificationsView(data) {
  const rows = (data.items || []).map((item) => [
    `<span class="badge ${badgeClass(item.level)}">${escapeHtml(item.title)}</span>`,
    escapeHtml(item.message),
    escapeHtml(formatDate(item.createdAt)),
    item.read
      ? "<span class=\"badge success\">Lida</span>"
      : `<button class="button secondary" type="button" data-read-notification="${item.id}">Marcar como lida</button>`
  ]);

  return `
    ${moduleHeader("Notificações", "Acompanhe alertas e mensagens direcionadas ao seu perfil.")}
    ${tableCard("Caixa de entrada", `${data.unreadCount || 0} notificações ainda não lidas.`, ["Título", "Mensagem", "Quando", "Ação"], rows)}
  `;
}

function historyView(data) {
  return `
    ${moduleHeader("Histórico", "Auditoria simples do que aconteceu na plataforma e quando aconteceu.")}
    ${timelineCard("Linha do tempo", "Eventos mais recentes registrados no sistema.", data.items || [])}
  `;
}

const actionPlansConfig = {
  title: "Planos de ação",
  description: "Estruture frentes, responsáveis e prazos em um fluxo claro de execução.",
  tableTitle: "Carteira de planos",
  tableDescription: "Planos de ação acessíveis ao seu perfil.",
  headers: ["Plano", "Origem", "Unidade", "Responsável", "Prazo", "Prioridade", "Status"],
  formTitle: "Novo plano de ação",
  formDescription: "Abra uma frente com objetivo claro e dono definido.",
  dependencies: { requiresUnits: true, requiresUsers: true },
  managePermission: "actionPlans.manage",
  columns: [
    (item) => escapeHtml(item.title),
    (item) => item.meetingSubject
      ? `<span class="badge info">${escapeHtml(item.meetingSubject)}</span>`
      : "<span class=\"badge\">Direta</span>",
    (item, context) => escapeHtml(getLookupName(context.lookups, "units", item.unitId)),
    (item, context) => escapeHtml(getUserLabel(context.lookups, item.ownerId, item.legacyOwnerName)),
    (item) => escapeHtml(formatDate(item.dueDate)),
    (item) => statusBadge(item.priority || "medium"),
    (item) => statusBadge(item.status || "open")
  ],
  form(context) {
    return `
      <form class="stack" data-form="actionPlans">
        <label class="field">
          <span>Título do plano</span>
          <input name="title" required>
        </label>
        <label class="field">
          <span>Objetivo</span>
          <textarea name="objective" placeholder="Descreva o objetivo principal do plano"></textarea>
        </label>
        <div class="form-grid">
          <label class="field">
            <span>Unidade</span>
            <select name="unitId" required>${optionList(context.lookups.units)}</select>
          </label>
          <label class="field">
          <span>Responsável</span>
            <select name="ownerId" required>${optionList(context.lookups.users)}</select>
          </label>
          <label class="field">
            <span>Prioridade</span>
            <select name="priority">
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
              <option value="critical">Crítica</option>
            </select>
          </label>
          <label class="field">
            <span>Prazo</span>
            <input type="date" name="dueDate" required>
          </label>
        </div>
        <button class="button primary" type="submit">Criar plano</button>
      </form>
    `;
  }
};

function actionFilterOptions(items, selector) {
  const values = [...new Set(items.map(selector).filter(Boolean))].sort((left, right) =>
    String(left).localeCompare(String(right), "pt-BR")
  );
  return values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
}

function actionCreationForm(meetings, context) {
  const initialMeeting = meetings.find((item) => arrayValue(item.subjects).length > 0) || meetings[0] || null;
  const initialSubjects = arrayValue(initialMeeting?.subjects);
  const meetingOptions = meetings.map((item) => {
    const selected = initialMeeting && String(item.id) === String(initialMeeting.id) ? "selected" : "";
    return `<option value="${escapeHtml(item.id)}" data-subjects="${jsonAttribute(item.subjects)}" ${selected}>${escapeHtml(item.title)}</option>`;
  }).join("");

  return `
    <form class="stack meeting-action-form action-create-form" data-form="meetingActions">
      <div class="form-grid">
        <label class="field"><span>Reunião</span><select name="meetingId" data-meeting-select required>${meetingOptions}</select></label>
        <label class="field"><span>Data de execução</span><input type="date" name="executionDate" required></label>
        <label class="field"><span>Solicitante</span><input value="${escapeHtml(context.user?.name || "")}" disabled></label>
        <label class="field"><span>Assunto</span><select name="subject" data-meeting-subject ${initialSubjects.length ? "" : "disabled"} required>${initialSubjects.length ? valueOptions(initialSubjects) : "<option value=\"\">Nenhum assunto cadastrado</option>"}</select></label>
        <label class="field"><span>Responsável pela ação</span><select name="ownerId" data-action-field><option value="">Selecionar</option>${optionList(context.lookups?.users || [])}</select></label>
        <label class="field"><span>Prazo da ação</span><input type="date" name="dueDate" data-action-field></label>
        <label class="field"><span>Prioridade</span><select name="priority" data-action-field><option value="high">Alta</option><option value="medium">Média</option><option value="low">Baixa</option></select></label>
      </div>
      <div class="form-actions">
        <button class="button primary" type="submit" data-save-meeting-action ${initialSubjects.length ? "" : "disabled"}>Salvar ação</button>
        <button class="button secondary" type="button" data-close-action-form>Cancelar</button>
      </div>
    </form>
  `;
}

function actionPlansView(data, context) {
  const items = data.items || [];
  const meetings = data.meetings?.items || [];
  const canCreate = userCan(context, "meetings.manage") && userCan(context, "actionPlans.manage");

  if (context.actionWorkspace === "create") {
    return `
      <section class="action-subview">
        <header class="action-workspace-header">
          <div><p class="eyebrow">Ações</p><h2>Nova ação</h2><p>Vincule a ação à reunião e selecione um assunto cadastrado.</p></div>
          <button class="button secondary" type="button" data-close-action-form>Voltar para ações</button>
        </header>
        ${formCard("Dados da ação", "O solicitante é preenchido conforme o usuário conectado.", canCreate ? actionCreationForm(meetings, context) : dependencyNotice("Acesso somente para consulta", "Seu perfil não pode abrir novas ações."))}
      </section>
    `;
  }

  const rows = items.map((item) => {
    const actionText = [item.title, item.objective, item.meetingSubject].filter(Boolean).join(" ");
    const requester = item.requesterName || item.legacyRequesterName || "Não informado";
    const owner = getUserLabel(context.lookups, item.ownerId, item.legacyOwnerName);
    return `<tr data-action-row data-action-text="${escapeHtml(actionText)}" data-meeting="${escapeHtml(item.meetingTitle || "")}" data-requester="${escapeHtml(requester)}" data-owner="${escapeHtml(owner)}" data-execution="${escapeHtml(item.meetingExecutionDate || "")}" data-due="${escapeHtml(item.dueDate || "")}" data-priority="${escapeHtml(item.priority || "medium")}" data-status="${escapeHtml(item.status || "open")}">
      <td data-label="Data">${escapeHtml(formatDate(item.meetingExecutionDate || item.createdAt))}</td>
      <td data-label="Reunião">${escapeHtml(item.meetingTitle || "Não vinculada")}</td>
      <td data-label="Assunto">${escapeHtml(item.meetingSubject || item.title)}</td>
      <td class="action-plan-cell" data-label="Plano de ação">${escapeHtml(item.objective || item.title)}</td>
      <td data-label="Solicitante">${escapeHtml(requester)}</td>
      <td data-label="Responsável">${escapeHtml(owner)}</td>
      <td data-label="Prazo">${escapeHtml(formatDate(item.dueDate))}</td>
      <td data-label="Prioridade">${statusBadge(item.priority || "medium")}</td>
      <td data-label="Status">${actionStatusBadge(item.status || "open")}</td>
    </tr>`;
  }).join("");

  return `
    <section class="action-workspace">
      <header class="action-workspace-header">
        <div><p class="eyebrow">Acompanhamento operacional</p><h2>Carteira de ações</h2><p>Consulte, filtre e acompanhe as ações vinculadas às reuniões.</p></div>
        ${canCreate ? '<button class="button primary" type="button" data-open-action-form>Nova ação</button>' : ""}
      </header>
      <section class="action-filter-card">
        <div class="action-filter-heading"><strong>Filtros</strong><button class="button ghost" type="button" data-clear-action-filters>Limpar filtros</button></div>
        <div class="action-filter-grid" data-action-filters>
          <label class="field"><span>Buscar ação ou assunto</span><input type="search" data-action-filter="text" placeholder="Digite para buscar"></label>
          <label class="field"><span>Reunião</span><select data-action-filter="meeting"><option value="">Todas</option>${actionFilterOptions(items, (item) => item.meetingTitle)}</select></label>
          <label class="field"><span>Solicitante</span><select data-action-filter="requester"><option value="">Todos</option>${actionFilterOptions(items, (item) => item.requesterName || item.legacyRequesterName)}</select></label>
          <label class="field"><span>Responsável</span><select data-action-filter="owner"><option value="">Todos</option>${actionFilterOptions(items, (item) => getUserLabel(context.lookups, item.ownerId, item.legacyOwnerName))}</select></label>
          <label class="field"><span>Prioridade</span><select data-action-filter="priority"><option value="">Todas</option><option value="high">Alta</option><option value="medium">Média</option><option value="low">Baixa</option></select></label>
          <label class="field"><span>Status</span><select data-action-filter="status"><option value="">Todos</option><option value="open">Parado</option><option value="in_progress">Em andamento</option><option value="done">Concluído</option></select></label>
          <label class="field"><span>Data de execução</span><input type="date" data-action-filter="execution"></label>
          <label class="field"><span>Prazo</span><input type="date" data-action-filter="due"></label>
        </div>
        <p class="action-filter-result" data-action-filter-result>${items.length} ações encontradas</p>
      </section>
      <section class="table-card action-portfolio-card" data-action-portfolio>
        ${rows ? `<div class="table-scroll"><table class="action-table"><colgroup><col class="action-date-column"><col class="action-meeting-column"><col class="action-subject-column"><col class="action-plan-column"><col class="action-requester-column"><col class="action-owner-column"><col class="action-deadline-column"><col class="action-priority-column"><col class="action-status-column"></colgroup><thead><tr><th>Data</th><th>Reunião</th><th>Assunto</th><th>Plano de ação</th><th>Solicitante</th><th>Responsável</th><th>Prazo</th><th>Prioridade</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="empty-state"><div><h2>Sem ações</h2><p>As novas ações abertas nas reuniões aparecerão aqui.</p></div></div>'}
      </section>
    </section>
  `;
}

function meetingsView(data, context) {
  const meetings = data.items || [];
  const initialMeeting = meetings.find((item) => arrayValue(item.subjects).length > 0) || meetings[0] || null;
  const initialSubjects = arrayValue(initialMeeting?.subjects);
  const meetingOptions = meetings.map((item) => {
    const selected = initialMeeting && String(item.id) === String(initialMeeting.id) ? "selected" : "";
    return `
      <option value="${escapeHtml(item.id)}" data-subjects="${jsonAttribute(item.subjects)}" ${selected}>
        ${escapeHtml(item.title)}
      </option>
    `;
  }).join("");
  const ownerOptions = `<option value="">Selecionar</option>${optionList(context.lookups?.users || [])}`;
  const disabledSubject = initialSubjects.length === 0 ? "disabled" : "";

  const formContent = userCan(context, "meetings.manage") && userCan(context, "actionPlans.manage")
    ? `
      <form class="stack meeting-action-form" data-form="meetingActions">
        <div class="meeting-toolbar">
          <button class="button secondary" type="button" data-start-meeting>Iniciar reunião</button>
          <div class="meeting-timer" aria-live="polite">
            <span>Duração</span>
            <strong data-meeting-timer>00:00:00</strong>
          </div>
        </div>
        <div class="form-grid">
          <label class="field">
            <span>Reunião</span>
            <select name="meetingId" data-meeting-select required>
              ${meetingOptions}
            </select>
          </label>
          <label class="field">
            <span>Data de execução</span>
            <input type="date" name="executionDate" required>
          </label>
          <label class="field">
            <span>Solicitante</span>
            <input value="${escapeHtml(context.user?.name || "")}" disabled>
          </label>
          <label class="field">
            <span>Assunto</span>
            <select name="subject" data-meeting-subject ${disabledSubject} required>
              ${initialSubjects.length > 0
                ? valueOptions(initialSubjects)
                : "<option value=\"\">Nenhum assunto cadastrado</option>"}
            </select>
          </label>
          <label class="field">
            <span>Responsável pela ação</span>
            <select name="ownerId" data-action-field>${ownerOptions}</select>
          </label>
        </div>
        <div class="form-grid">
          <label class="field">
            <span>Prazo da ação</span>
            <input type="date" name="dueDate" data-action-field>
          </label>
          <label class="field">
            <span>Prioridade</span>
            <select name="priority" data-action-field>
              <option value="high">Alta</option>
              <option value="medium">Média</option>
              <option value="low">Baixa</option>
            </select>
          </label>
        </div>
        <div class="form-actions">
          <button class="button primary" type="submit" data-save-meeting-action ${initialSubjects.length === 0 ? "disabled" : ""}>Salvar ação</button>
          <button class="button secondary" type="button" data-close-meeting>Encerrar reunião</button>
        </div>
      </form>
    `
    : dependencyNotice(
        "Acesso somente para consulta",
        "Seu perfil pode visualizar reuniões, mas não pode abrir ações ou encerrar reuniões por aqui."
      );

  return `
    ${moduleHeader("Reuniões", "Conduza a reunião, selecione o assunto e abra ações diretamente em Ações.")}
    <div class="single-layout meeting-workspace">
      ${formCard("Conduzir reunião", "A data de execução permanece na tela enquanto você abre quantas ações forem necessárias.", formContent)}
    </div>
  `;
}

function administrationView(data, context) {
  const meetings = data.items || [];
  const rows = meetings.map((item) => [
    escapeHtml(item.title),
    escapeHtml(arrayValue(item.subjects).length),
    escapeHtml(item.lastExecutionDate ? formatDate(item.lastExecutionDate) : "Ainda não executada"),
    item.importedFrom ? "<span class=\"badge info\">Planilha</span>" : "<span class=\"badge success\">Manual</span>",
    `<button class="button secondary" type="button" data-delete-meeting="${escapeHtml(item.id)}">Excluir</button>`
  ]);
  const formContent = userCan(context, "administration.manage")
    ? `
      <form class="stack" data-form="adminMeetings">
        <label class="field">
          <span>Nome da reunião</span>
          <input name="title" required placeholder="Ex.: Reunião semanal de resultados">
        </label>
        <label class="field">
          <span>Assuntos</span>
          <textarea name="subjects" placeholder="Digite um assunto por linha"></textarea>
        </label>
        <button class="button primary" type="submit">Cadastrar reunião</button>
      </form>
    `
    : dependencyNotice("Acesso restrito", "Este módulo é exclusivo da administração.");

  return `
    ${moduleHeader("Administração", "Gerencie as reuniões cadastradas e os assuntos disponíveis no módulo Reuniões.")}
    <div class="split-layout administration-layout">
      ${tableCard("Reuniões cadastradas", "Cadastros disponíveis para condução de reuniões.", ["Reunião", "Assuntos", "Última execução", "Origem", "Ação"], rows)}
      ${formCard("Nova reunião", "Cadastre novas reuniões e seus assuntos correspondentes.", formContent)}
    </div>
  `;
}

const gapaConfig = {
  title: "GAPA",
  description: "Centralize registros GAPA, frentes em andamento e responsáveis pela tratativa.",
  tableTitle: "Registros GAPA",
  tableDescription: "Itens GAPA disponíveis para acompanhamento do seu perfil.",
  headers: ["Registro", "Categoria", "Unidade", "Responsável", "Status"],
  formTitle: "Novo registro GAPA",
  formDescription: "Abra um registro com contexto, dono e próximo passo definidos.",
  dependencies: { requiresUnits: true, requiresUsers: true },
  managePermission: "gapa.manage",
  columns: [
    (item) => escapeHtml(item.title),
    (item) => escapeHtml(item.category || "Geral"),
    (item, context) => escapeHtml(getLookupName(context.lookups, "units", item.unitId)),
    (item, context) => escapeHtml(getUserLabel(context.lookups, item.ownerId)),
    (item) => statusBadge(item.status || "open")
  ],
  form(context) {
    return `
      <form class="stack" data-form="gapa">
        <label class="field">
          <span>Título do registro</span>
          <input name="title" required>
        </label>
        <div class="form-grid">
          <label class="field">
            <span>Categoria</span>
            <input name="category" placeholder="Processo, rotina, melhoria...">
          </label>
          <label class="field">
            <span>Unidade</span>
            <select name="unitId" required>${optionList(context.lookups.units)}</select>
          </label>
          <label class="field">
            <span>Responsável</span>
            <select name="ownerId" required>${optionList(context.lookups.users)}</select>
          </label>
          <label class="field">
            <span>Status</span>
            <select name="status">
              <option value="open">Aberto</option>
              <option value="in_progress">Em andamento</option>
              <option value="done">Concluído</option>
            </select>
          </label>
        </div>
        <label class="field">
          <span>Resumo</span>
          <textarea name="summary" placeholder="Registre contexto, causa ou encaminhamento"></textarea>
        </label>
        <button class="button primary" type="submit">Criar registro</button>
      </form>
    `;
  }
};

const dtoConfig = {
  title: "DTO - Diagnóstico de tarefa operacional",
  description: "Registre o diagnóstico, o responsável e o próximo passo para cada tratativa operacional.",
  tableTitle: "Diagnósticos operacionais",
  tableDescription: "DTOs ativos ou recentemente atualizados no seu escopo.",
  headers: ["Diagnóstico", "Unidade", "Responsável", "Prazo", "Status"],
  formTitle: "Novo DTO",
  formDescription: "Formalize um diagnóstico de tarefa operacional com clareza e rastreabilidade.",
  dependencies: { requiresUnits: true, requiresUsers: true },
  managePermission: "dto.manage",
  columns: [
    (item) => escapeHtml(item.title),
    (item, context) => escapeHtml(getLookupName(context.lookups, "units", item.unitId)),
    (item, context) => escapeHtml(getUserLabel(context.lookups, item.ownerId)),
    (item) => escapeHtml(formatDate(item.dueDate)),
    (item) => statusBadge(item.status || "analysis")
  ],
  form(context) {
    return `
      <form class="stack" data-form="dto">
        <label class="field">
          <span>Título do diagnóstico</span>
          <input name="title" required>
        </label>
        <label class="field">
          <span>Diagnóstico</span>
          <textarea name="diagnosis" placeholder="Descreva causa, impacto e direcionamento"></textarea>
        </label>
        <div class="form-grid">
          <label class="field">
            <span>Unidade</span>
            <select name="unitId" required>${optionList(context.lookups.units)}</select>
          </label>
          <label class="field">
            <span>Responsável</span>
            <select name="ownerId" required>${optionList(context.lookups.users)}</select>
          </label>
          <label class="field">
            <span>Prazo</span>
            <input type="date" name="dueDate" required>
          </label>
          <label class="field">
            <span>Status</span>
            <select name="status">
              <option value="analysis">Em diagnóstico</option>
              <option value="in_progress">Em andamento</option>
              <option value="completed">Concluído</option>
            </select>
          </label>
        </div>
        <button class="button primary" type="submit">Registrar DTO</button>
      </form>
    `;
  }
};

const anomalyReportsConfig = {
  title: "Relato de anomalia",
  description: "Registre desvios, impactos e prazos de tratativa com uma leitura mais objetiva.",
  tableTitle: "Anomalias registradas",
  tableDescription: "Relatos ativos dentro do seu escopo de acompanhamento.",
  headers: ["Relato", "Origem", "Unidade", "Severidade", "Status"],
  formTitle: "Novo relato de anomalia",
  formDescription: "Capture a anomalia com clareza para acelerar o tratamento.",
  dependencies: { requiresUnits: true },
  managePermission: "anomalyReports.manage",
  columns: [
    (item) => escapeHtml(item.title),
    (item) => escapeHtml(item.source || "Operação"),
    (item, context) => escapeHtml(getLookupName(context.lookups, "units", item.unitId)),
    (item) => statusBadge(item.severity || "medium"),
    (item) => statusBadge(item.status || "open")
  ],
  form(context) {
    return `
      <form class="stack" data-form="anomalyReports">
        <label class="field">
          <span>Título do relato</span>
          <input name="title" required>
        </label>
        <div class="form-grid">
          <label class="field">
            <span>Origem</span>
            <input name="source" placeholder="Processo, equipamento, rotina...">
          </label>
          <label class="field">
            <span>Unidade</span>
            <select name="unitId" required>${optionList(context.lookups.units)}</select>
          </label>
          <label class="field">
            <span>Severidade</span>
            <select name="severity">
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
              <option value="critical">Crítica</option>
            </select>
          </label>
          <label class="field">
            <span>Prazo</span>
            <input type="date" name="dueDate">
          </label>
        </div>
        <label class="field">
          <span>Descrição</span>
          <textarea name="description" placeholder="Descreva a anomalia e o impacto observado"></textarea>
        </label>
        <button class="button primary" type="submit">Registrar anomalia</button>
      </form>
    `;
  }
};

const gerotConfig = {
  title: "GEROT",
  description: "Acompanhe registros, frentes e encaminhamentos do GEROT em uma trilha única.",
  tableTitle: "Registros GEROT",
  tableDescription: "Itens GEROT ativos no seu escopo.",
  headers: ["Registro", "Frente", "Unidade", "Responsável", "Status"],
  formTitle: "Novo registro GEROT",
  formDescription: "Abra um registro GEROT com responsável definido e prazo claro.",
  dependencies: { requiresUnits: true, requiresUsers: true },
  managePermission: "gerot.manage",
  columns: [
    (item) => escapeHtml(item.title),
    (item) => escapeHtml(item.front || "Geral"),
    (item, context) => escapeHtml(getLookupName(context.lookups, "units", item.unitId)),
    (item, context) => escapeHtml(getUserLabel(context.lookups, item.ownerId)),
    (item) => statusBadge(item.status || "open")
  ],
  form(context) {
    return `
      <form class="stack" data-form="gerot">
        <label class="field">
          <span>Título do registro</span>
          <input name="title" required>
        </label>
        <div class="form-grid">
          <label class="field">
            <span>Frente</span>
            <input name="front" placeholder="Rotina, tratativa, melhoria...">
          </label>
          <label class="field">
            <span>Unidade</span>
            <select name="unitId" required>${optionList(context.lookups.units)}</select>
          </label>
          <label class="field">
            <span>Responsável</span>
            <select name="ownerId" required>${optionList(context.lookups.users)}</select>
          </label>
          <label class="field">
            <span>Status</span>
            <select name="status">
              <option value="open">Aberto</option>
              <option value="in_progress">Em andamento</option>
              <option value="closed">Encerrado</option>
            </select>
          </label>
        </div>
        <label class="field">
          <span>Observações</span>
          <textarea name="notes" placeholder="Registre contexto, tratativa e próximo passo"></textarea>
        </label>
        <button class="button primary" type="submit">Criar registro</button>
      </form>
    `;
  }
};

export const views = {
  dashboard: {
    title: "Dashboard",
    load: (api, token) => api.dashboard(token),
    render: (data) => dashboardView(data)
  },
  audit: {
    title: "Painel de auditoria",
    load: async (api, token) => {
      const [dashboard, notifications, history] = await Promise.all([
        api.dashboard(token),
        api.list(token, "/notifications"),
        api.list(token, "/history")
      ]);

      return { dashboard, notifications, history };
    },
    render: (data) => auditPanelView(data)
  },
  administration: {
    title: "Administração",
    load: (api, token) => api.list(token, "/administration/meetings"),
    render: (data, context) => administrationView(data, context)
  },
  actionPlans: {
    title: "Ações",
    load: async (api, token) => {
      const [actions, meetings] = await Promise.all([
        api.list(token, "/action-plans"),
        api.list(token, "/meetings")
      ]);
      return { ...actions, meetings };
    },
    render: (data, context) => actionPlansView(data, context)
  },
  meetings: {
    title: "Reuniões",
    load: (api, token) => api.list(token, "/meetings"),
    render: (data, context) => meetingsView(data, context)
  },
  gapa: {
    title: "GAPA",
    load: (api, token) => api.list(token, "/gapa"),
    render: (data, context) => operationsView(gapaConfig, data, context)
  },
  dto: {
    title: "DTO",
    load: (api, token) => api.list(token, "/dto"),
    render: (data, context) => operationsView(dtoConfig, data, context)
  },
  anomalyReports: {
    title: "Relato de anomalia",
    load: (api, token) => api.list(token, "/anomaly-reports"),
    render: (data, context) => operationsView(anomalyReportsConfig, data, context)
  },
  gerot: {
    title: "GEROT",
    load: (api, token) => api.list(token, "/gerot"),
    render: (data, context) => operationsView(gerotConfig, data, context)
  },
  users: {
    title: "Usuários e permissões",
    load: (api, token) => api.list(token, "/users"),
    render: (data, context) => usersView(data, context)
  },
  notifications: {
    title: "Notificações",
    load: (api, token) => api.list(token, "/notifications"),
    render: (data) => notificationsView(data)
  },
  history: {
    title: "Histórico",
    load: (api, token) => api.list(token, "/history"),
    render: (data) => historyView(data)
  }
};
