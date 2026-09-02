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
  notifications: "Notificações",
  history: "Histórico"
};

const VALUE_LABELS = {
  pending: "Não iniciada",
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

function toInt(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

function meetingResponsibleOptionList(items, selectedValue = "") {
  return items
    .map((item) => {
      const parts = String(item.name || item.label || item.username || "").trim().split(/\s+/).filter(Boolean);
      const formatPart = (part) => {
        const normalized = part.toLocaleLowerCase("pt-BR");
        return normalized.charAt(0).toLocaleUpperCase("pt-BR") + normalized.slice(1);
      };
      const label = parts.length > 1
        ? `${formatPart(parts[0])} ${formatPart(parts[parts.length - 1])}`
        : formatPart(parts[0]) || item.id;
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

function tableCard(title, description, headers, rows, className = "") {
  return `
    <section class="table-card ${escapeHtml(className)}">
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

function dashboardView(data, context) {
  const actionRows = (data.actionPlans || []).map((item) => {
    const requester = item.requesterName || item.legacyRequesterName || "Não informado";
    const owner = getUserLabel(context.lookups, item.ownerId, item.legacyOwnerName);
    return `<tr>
      <td data-label="Data">${escapeHtml(formatDate(item.meetingExecutionDate || item.createdAt))}</td>
      <td data-label="Reunião">${escapeHtml(item.meetingTitle || "Não vinculada")}</td>
      <td data-label="Assunto">${escapeHtml(item.meetingSubject || item.title)}</td>
      <td data-label="Solicitante">${escapeHtml(requester)}</td>
      <td data-label="Responsável">${escapeHtml(owner)}</td>
      <td class="action-plan-cell" data-label="Ação">${escapeHtml(item.objective || item.title)}</td>
      <td data-label="Prazo">${escapeHtml(formatDate(item.dueDate))}</td>
      <td data-label="Status">${actionStatusBadge(item.status || "open")}</td>
    </tr>`;
  }).join("");
  const meetingRows = (data.meetings || []).map((item) => [
    escapeHtml(item.title),
    escapeHtml(formatDate(item.scheduledAt)),
    escapeHtml(getUserLabel(context.lookups, item.ownerId)),
    statusBadge(item.status || "scheduled")
  ]);
  const activeUsersRows = (data.presence?.events || []).slice().reverse().map((item) => [
    escapeHtml(item.name),
    escapeHtml(moduleLabel(item.module)),
    escapeHtml(formatDate(new Date(Number(item.occurredAt)).toISOString()))
  ]);
  const dashboardCards = [
    ...(data.kpis || []),
    {
      label: "Usuários online",
      value: (data.presence?.users || []).length,
      helper: "Pessoas ativas na plataforma agora"
    }
  ];

  return `
    ${moduleHeader("Dashboard operacional", "Acompanhe todas as ações abertas e em andamento pela equipe.")}
    ${metricCards(dashboardCards)}
    <section class="table-card action-portfolio-card">
      <div class="table-card-header"><div><h3>Ações em andamento</h3><p>Consulta compartilhada apenas das ações abertas ou em andamento.</p></div></div>
      ${actionRows ? `<div class="table-scroll"><table class="action-table"><colgroup><col class="action-date-column"><col class="action-meeting-column"><col class="action-subject-column"><col class="action-requester-column"><col class="action-owner-column"><col class="action-plan-column"><col class="action-date-column"><col class="action-status-column"></colgroup><thead><tr><th>Data</th><th>Reunião</th><th>Assunto</th><th>Solicitante</th><th>Responsável</th><th>Ações</th><th>Prazo</th><th>Status</th></tr></thead><tbody>${actionRows}</tbody></table></div>` : '<div class="empty-state"><div><h2>Sem ações cadastradas</h2><p>As próximas ações abertas pela equipe aparecerão aqui.</p></div></div>'}
    </section>
    ${tableCard("Reuniões em andamento", "Consulta compartilhada das reuniões agendadas ou em execução.", ["Reunião", "Data", "Responsável", "Status"], meetingRows)}
    ${tableCard("Usuários ativos agora", "Movimentações registradas nos últimos 60 segundos.", ["Usuário", "Módulo acessado", "Quando"], activeUsersRows)}
  `;
}

function auditPanelView(data, context) {
  const items = data.items || [];
  const counts = Object.fromEntries(["pending", "in_progress", "done"].map((status) => [status, items.filter((item) => item.status === status).length]));
  const isAdmin = context.user?.role === "admin";
  const pilarOptions = [...new Set(items.map((item) => item.pilar))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const ownerOptions = [...new Set(items.map((item) => item.responsavel))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const cards = [
    { label: "Total de ações", value: items.length, helper: isAdmin ? "Carteira completa da auditoria" : "Ações sob sua responsabilidade" },
    { label: "Não iniciadas", value: counts.pending, helper: "Aguardando início" },
    { label: "Em andamento", value: counts.in_progress, helper: "Atuação registrada agora" },
    { label: "Concluídas", value: counts.done, helper: `${items.length ? Math.round((counts.done / items.length) * 100) : 0}% da carteira` }
  ];

  const rows = items.map((item) => {
    const canMove = item.username === context.user?.username;
    const controls = item.status === "pending" && canMove
      ? `<button class="button primary audit-action-button" type="button" data-audit-action="${item.id}" data-audit-status="in_progress">Iniciar</button>`
      : item.status === "in_progress" && canMove
        ? `<button class="button primary audit-action-button" type="button" data-audit-action="${item.id}" data-audit-status="done">Concluir</button>`
        : "";
    return `<tr data-audit-row data-search="${escapeHtml(`${item.pilar} ${item.bloco} ${item.questao} ${item.acao} ${item.meta} ${item.responsavel}`)}" data-pilar="${escapeHtml(item.pilar)}" data-owner="${escapeHtml(item.responsavel)}" data-status="${escapeHtml(item.status)}">
      <td><span class="badge info">${escapeHtml(item.pilar)}</span></td>
      <td>${escapeHtml(item.bloco)}</td>
      <td><strong>${escapeHtml(item.questao)}</strong></td>
      <td class="audit-text-cell">${escapeHtml(item.acao)}</td>
      <td class="audit-text-cell">${escapeHtml(item.meta)}</td>
      <td><strong>${escapeHtml(item.responsavel)}</strong></td>
      <td><div class="audit-status-cell"><span class="badge ${badgeClass(item.status)}">${escapeHtml(formatValueLabel(item.status))}</span>${controls}${item.updatedAt ? `<small>${escapeHtml(formatDate(item.updatedAt))}</small>` : ""}</div></td>
    </tr>`;
  }).join("");

  return `
    ${moduleHeader("Painel de auditoria", isAdmin ? "Acompanhe em tempo real a atuação dos responsáveis." : "Inicie e conclua as ações atribuídas ao seu usuário.")}
    <section class="audit-live-strip"><span class="audit-live-dot"></span><strong>Sincronização ativa</strong><span>Atualizado ${escapeHtml(formatDate(data.syncedAt))}</span></section>
    ${metricCards(cards)}
    <section class="action-filter-card" data-audit-filters>
      <div class="action-filter-heading"><div><h3>Localizar ações</h3><p>Filtre a carteira por pilar, responsável ou situação.</p></div><button class="button secondary" type="button" data-clear-audit-filters>Limpar filtros</button></div>
      <div class="action-filter-grid audit-filter-grid">
        <label class="field"><span>Buscar</span><input data-audit-filter="text" placeholder="Questão, ação ou meta"></label>
        <label class="field"><span>Pilar</span><select data-audit-filter="pilar"><option value="">Todos</option>${pilarOptions.map((value) => `<option>${escapeHtml(value)}</option>`).join("")}</select></label>
        ${isAdmin ? `<label class="field"><span>Responsável</span><select data-audit-filter="owner"><option value="">Todos</option>${ownerOptions.map((value) => `<option>${escapeHtml(value)}</option>`).join("")}</select></label>` : ""}
        <label class="field"><span>Status</span><select data-audit-filter="status"><option value="">Todos</option><option value="pending">Não iniciada</option><option value="in_progress">Em andamento</option><option value="done">Concluída</option></select></label>
      </div>
      <p class="action-filter-result" data-audit-filter-result>${items.length} ações encontradas</p>
    </section>
    <section class="table-card audit-table-card">
      <div class="table-card-header"><div><h3>${isAdmin ? "Acompanhamento da equipe" : "Minhas ações de auditoria"}</h3><p>Os status são compartilhados entre os usuários e atualizados automaticamente.</p></div></div>
      <div class="table-scroll"><table class="audit-actions-table"><thead><tr><th>Pilar</th><th>Bloco</th><th>Questão</th><th>Ação</th><th>Meta</th><th>Responsável</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>
    </section>
  `;
}

function usersView(data, context) {
  const rows = (data.items || []).map((item) => [
    escapeHtml(item.name),
    escapeHtml(item.username),
    escapeHtml(item.department || "Não informado"),
    `<span class="badge info">${escapeHtml(item.roleLabel)}</span>`,
    `<span class="badge ${badgeClass(item.status || "active")}">${escapeHtml(item.status || "active")}</span>`
  ]);
  const resetRequests = (data.passwordResetRequests || []).filter((item) => item.status === "pending");
  const resetRows = resetRequests.map((item) => [
    escapeHtml(item.username),
    escapeHtml(formatDate(item.createdAt)),
    escapeHtml(formatDate(item.expiresAt)),
    `<button class="button secondary" type="button" data-approve-password-reset="${escapeHtml(item.id)}">Validar código</button>`
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
            <span>Setor</span>
            <input name="department" required>
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
    ${resetRequests.length > 0 ? tableCard("Recuperações aguardando ADM", "Aprove uma solicitação para liberar o código temporário ao usuário.", ["Usuário", "Solicitado em", "Expira em", "Ação"], resetRows) : ""}
    <div class="split-layout">
      ${tableCard("Usuários ativos", "Lista atual de acessos disponíveis.", ["Nome", "Usuário", "Setor", "Perfil", "Status"], rows)}
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
          <span>Plano de ação</span>
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
            <select name="ownerId" required>${meetingResponsibleOptionList(context.lookups.responsibleUsers || context.lookups.users)}</select>
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

function executionMonthKey(value = "") {
  const match = String(value).match(/^\d{4}-\d{2}/);
  return match ? match[0] : "";
}

function executionMonthOptions(items) {
  const months = [...new Set(items.map((item) => executionMonthKey(item.meetingExecutionDate || item.createdAt)).filter(Boolean))]
    .sort()
    .reverse();
  return months.map((month) => {
    const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" })
      .format(new Date(`${month}-01T12:00:00`));
    return `<option value="${escapeHtml(month)}">${escapeHtml(label)}</option>`;
  }).join("");
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
        <label class="field full"><span>Plano de ação</span><textarea name="actionPlan" placeholder="Descreva o plano de ação definido na reunião" required></textarea></label>
        <label class="field"><span>Responsável pela ação</span><select name="ownerId" data-action-field required><option value="">Selecionar</option>${meetingResponsibleOptionList(context.lookups?.responsibleUsers || context.lookups?.users || [])}</select></label>
        <label class="field"><span>Prazo da ação</span><input type="date" name="dueDate" data-action-field></label>
        <label class="field"><span>Prioridade</span><select name="priority" data-action-field><option value="high">Alta</option><option value="medium">Média</option><option value="low">Baixa</option></select></label>
      </div>
      <label class="field full attachment-field">
        <span>Documento da ação (PDF ou foto)</span>
        <input type="file" name="attachment" accept="application/pdf,image/jpeg,image/png" data-action-field>
        <small>Formatos aceitos: PDF, JPG, JPEG ou PNG. Limite de 5 MB.</small>
      </label>
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
    const canComplete = toInt(item.ownerId) === toInt(context.user?.id) && item.status !== "done";
    const statusCell = `${actionStatusBadge(item.status || "open")}${canComplete ? ` <button class="button secondary action-complete-button" type="button" data-complete-action="${escapeHtml(item.id)}">Concluir</button>` : ""}`;
    const attachment = item.attachment?.data
      ? `<a class="button ghost attachment-link" href="${escapeHtml(item.attachment.data)}" download="${escapeHtml(item.attachment.name || "documento")}" target="_blank" rel="noopener">Ver anexo</a>`
      : `<span class="text-muted">Sem anexo</span>`;
    return `<tr data-action-row data-action-text="${escapeHtml(actionText)}" data-meeting="${escapeHtml(item.meetingTitle || "")}" data-requester="${escapeHtml(requester)}" data-owner="${escapeHtml(owner)}" data-execution-month="${escapeHtml(executionMonthKey(item.meetingExecutionDate || item.createdAt))}" data-status="${escapeHtml(item.status || "open")}">
      <td data-label="Data">${escapeHtml(formatDate(item.meetingExecutionDate || item.createdAt))}</td>
      <td data-label="Reunião">${escapeHtml(item.meetingTitle || "Não vinculada")}</td>
      <td data-label="Assunto">${escapeHtml(item.meetingSubject || item.title)}</td>
      <td class="action-plan-cell" data-label="Plano de ação">${escapeHtml(item.objective || item.title)}</td>
      <td data-label="Solicitante">${escapeHtml(requester)}</td>
      <td data-label="Responsável">${escapeHtml(owner)}</td>
      <td data-label="Prioridade">${statusBadge(item.priority || "medium")}</td>
      <td data-label="Status">${statusCell}</td>
      <td data-label="Anexo">${attachment}</td>
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
          <label class="field"><span>Buscar assunto</span><input type="search" data-action-filter="text" placeholder="Assunto ou plano de ação"></label>
          <label class="field"><span>Reunião</span><select data-action-filter="meeting"><option value="">Todas</option>${actionFilterOptions(items, (item) => item.meetingTitle)}</select></label>
          <label class="field"><span>Solicitante</span><select data-action-filter="requester"><option value="">Todos</option>${actionFilterOptions(items, (item) => item.requesterName || item.legacyRequesterName)}</select></label>
          <label class="field"><span>Responsável</span><select data-action-filter="owner"><option value="">Todos</option>${actionFilterOptions(items, (item) => getUserLabel(context.lookups, item.ownerId, item.legacyOwnerName))}</select></label>
          <label class="field"><span>Status</span><select data-action-filter="status"><option value="">Todos</option><option value="open">Parado</option><option value="in_progress">Em andamento</option><option value="done">Concluído</option></select></label>
          <label class="field"><span>Data de execução</span><select data-action-filter="executionMonth"><option value="">Todos os meses</option>${executionMonthOptions(items)}</select></label>
        </div>
        <p class="action-filter-result" data-action-filter-result>${items.length} ações encontradas</p>
      </section>
      <section class="table-card action-portfolio-card" data-action-portfolio>
        ${rows ? `<div class="table-scroll"><table class="action-table"><colgroup><col class="action-date-column"><col class="action-meeting-column"><col class="action-subject-column"><col class="action-plan-column"><col class="action-requester-column"><col class="action-owner-column"><col class="action-priority-column"><col class="action-status-column"><col class="action-attachment-column"></colgroup><thead><tr><th>Data</th><th>Reunião</th><th>Assunto</th><th>Plano de ação</th><th>Solicitante</th><th>Responsável</th><th>Prioridade</th><th>Status</th><th>Anexo</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="empty-state"><div><h2>Sem ações</h2><p>As novas ações abertas nas reuniões aparecerão aqui.</p></div></div>'}
      </section>
    </section>
  `;
}

function meetingHistoryView(data, context) {
  const meetings = data.history || [];
  const rows = meetings.map((item) => `<tr data-meeting-history-row data-title="${escapeHtml(item.title)}" data-subjects="${escapeHtml(arrayValue(item.subjects).join(" "))}" data-date="${escapeHtml(item.lastExecutionDate || "")}">
    <td data-label="Reunião">${escapeHtml(item.title)}</td>
    <td data-label="Assuntos">${escapeHtml(arrayValue(item.subjects).join(", ") || "Nenhum assunto")}</td>
    <td data-label="Data de execução">${escapeHtml(formatDate(item.lastExecutionDate))}</td>
    <td data-label="Status">${statusBadge("held")}</td>
  </tr>`).join("");

  return `
    ${moduleHeader("Histórico de reuniões", "Consulte as reuniões executadas e os dados registrados no encerramento.")}
    <section class="meeting-history-toolbar">
      <label class="field"><span>Pesquisar reunião</span><input type="search" data-meeting-history-filter="text" placeholder="Nome ou assunto"></label>
      <label class="field"><span>Data da execução</span><input type="date" data-meeting-history-filter="date"></label>
      <div class="meeting-history-actions">
        <button class="button secondary" type="button" data-meeting-history-period="all">Todas</button>
        <button class="button ghost" type="button" data-meeting-history-period="month">Este mês</button>
        <button class="button ghost" type="button" data-meeting-history-clear>Limpar filtros</button>
        <button class="button ghost" type="button" data-show-active-meetings>Voltar para reuniões</button>
      </div>
      <p class="action-filter-result" data-meeting-history-result>${meetings.length} reuniões executadas</p>
    </section>
    ${tableCard("Reuniões executadas", "Os campos abaixo refletem os dados registrados durante a execução.", ["Reunião", "Assuntos", "Data de execução", "Status"], rows)}
  `;
}

function meetingsView(data, context) {
  if (context.meetingWorkspace === "history") {
    return meetingHistoryView(data, context);
  }

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
  const ownerOptions = `<option value="">Selecionar</option>${meetingResponsibleOptionList(context.lookups?.responsibleUsers || context.lookups?.users || [])}`;
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
          <label class="field full">
            <span>Plano de ação</span>
            <textarea name="actionPlan" data-action-field placeholder="Descreva o plano de ação definido na reunião" required></textarea>
          </label>
          <label class="field">
            <span>Responsável pela ação</span>
            <select name="ownerId" data-action-field required>${ownerOptions}</select>
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
        <label class="field full attachment-field">
          <span>Documento da ação (PDF ou foto)</span>
          <input type="file" name="attachment" accept="application/pdf,image/jpeg,image/png" data-action-field>
          <small>Formatos aceitos: PDF, JPG, JPEG ou PNG. Limite de 5 MB.</small>
        </label>
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
    <div class="meeting-view-actions"><button class="button secondary" type="button" data-show-meeting-history>Histórico de reuniões</button></div>
    <div class="single-layout meeting-workspace">
      ${formCard("Conduzir reunião", "A data de execução permanece na tela enquanto você abre quantas ações forem necessárias.", formContent)}
    </div>
  `;
}

function administrationView(data, context) {
  const meetings = data.items || [];
  const users = data.users || [];
  const activeUsers = users.filter((item) => item.status === "active").length;
  const subjects = meetings.reduce((total, item) => total + arrayValue(item.subjects).length, 0);
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
  const userRows = users.map((item) => [
    escapeHtml(item.name),
    escapeHtml(item.username),
    escapeHtml(item.department || "Não informado")
  ]);

  return `
    ${moduleHeader("Administração", "Gerencie as reuniões cadastradas e os assuntos disponíveis no módulo Reuniões.")}
    <section class="administration-summary" aria-label="Resumo da administração">
      <article>
        <span>Reuniões</span>
        <strong>${escapeHtml(meetings.length)}</strong>
        <small>cadastros disponíveis</small>
      </article>
      <article>
        <span>Assuntos</span>
        <strong>${escapeHtml(subjects)}</strong>
        <small>pautas configuradas</small>
      </article>
      <article>
        <span>Usuários ativos</span>
        <strong>${escapeHtml(activeUsers)}</strong>
        <small>acessos liberados</small>
      </article>
    </section>
    <div class="split-layout administration-layout">
      ${tableCard("Reuniões cadastradas", "Cadastros disponíveis para condução de reuniões.", ["Reunião", "Assuntos", "Última execução", "Origem", "Ação"], rows, "administration-meetings")}
      <div class="administration-form">${formCard("Nova reunião", "Cadastre novas reuniões e seus assuntos correspondentes.", formContent)}</div>
    </div>
    <div class="administration-user-actions"><button class="button secondary" type="button" data-export="users">Exportar usuários</button></div>
    ${tableCard("Usuários cadastrados", "Informações dos usuários com acesso à plataforma.", ["Nome", "Usuário", "Setor"], userRows, "administration-users")}
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

const GEROT_MONTHS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

function gerotNumber(value, unit, displayFormat = unit) {
  if (value === null || value === undefined || value === "") return "–";
  const number = Number(value);
  if (!Number.isFinite(number)) return "–";
  if (displayFormat === "%") return new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(number);
  if (displayFormat === "HORA" || displayFormat === "MIN") {
    const seconds = Math.round(number * 86400);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  }
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(number);
}

function gerotUnwrapIfError(formula) {
  const expression = String(formula || "").replace(/^=/, "").trim();
  if (!/^IFERROR\(/i.test(expression) || !expression.endsWith(")")) return expression;
  const content = expression.slice(expression.indexOf("(") + 1, -1);
  let depth = 0;
  for (let index = 0; index < content.length; index += 1) {
    if (content[index] === "(") depth += 1;
    if (content[index] === ")") depth -= 1;
    if (content[index] === "," && depth === 0) return content.slice(0, index);
  }
  return content;
}

function gerotColumnIndex(column) {
  let value = 0;
  for (const character of column) value = value * 26 + character.charCodeAt(0) - 64;
  return value - 15; // O = primeiro mês
}

function gerotSpreadsheetFormula(row, rows, formula, monthIndex, stack = new Set()) {
  if (!formula) return null;
  const key = `${row.id}:${monthIndex ?? "ytd"}`;
  if (stack.has(key)) return null;
  const nextStack = new Set(stack).add(key);
  const rowsBySheetRow = new Map(rows.map((item) => [Number(item.sheetRow), item]));
  const numeric = (value) => Number.isFinite(Number(value)) ? Number(value) : null;
  const cell = (reference) => {
    const match = String(reference).match(/^([A-Z]+)(\d+)$/);
    if (!match) return null;
    const [, column, rowNumber] = match;
    const source = rowsBySheetRow.get(Number(rowNumber));
    if (!source) return null;
    if (column === "N") return gerotYtd(source, rows, true, nextStack);
    const index = gerotColumnIndex(column);
    if (index < 0 || index > 11) return null;
    const sourceFormula = arrayValue(source.formulas)[index];
    return sourceFormula ? gerotSpreadsheetFormula(source, rows, sourceFormula, index, nextStack) : numeric(source.monthly?.[index]);
  };
  const range = (from, to) => {
    const start = String(from).match(/^([A-Z]+)(\d+)$/);
    const end = String(to).match(/^([A-Z]+)(\d+)$/);
    if (!start || !end) return [];
    const values = [];
    for (let rowNumber = Number(start[2]); rowNumber <= Number(end[2]); rowNumber += 1) {
      for (let column = gerotColumnIndex(start[1]); column <= gerotColumnIndex(end[1]); column += 1) {
        const value = cell(`${String.fromCharCode(79 + column)}${rowNumber}`);
        if (Number.isFinite(value)) values.push(value);
      }
    }
    return values;
  };
  const sum = (values) => values.reduce((total, value) => total + value, 0);
  const average = (values) => values.length ? sum(values) / values.length : null;
  const ranges = [];
  const expression = gerotUnwrapIfError(formula)
    .replace(/^IF\((SUM\([^)]*\))=0,"",\(?\1\)?\)$/i, "$1")
    .replace(/\$([A-Z]+)/g, "$1")
    .replace(/([A-Z]+\d+):([A-Z]+\d+)/g, (_, from, to) => {
      ranges.push([from, to]);
      return `__range${ranges.length - 1}__`;
    })
    .replace(/\bSUM\(/gi, "sum(")
    .replace(/\bAVERAGE\(/gi, "average(")
    .replace(/\bABS\(/gi, "abs(")
    .replace(/\b([A-Z]{1,2}\d+)\b/g, (_, reference) => `cell("${reference}")`)
    .replace(/__range(\d+)__/g, (_, index) => `range("${ranges[index][0]}", "${ranges[index][1]}")`);
  try {
    return numeric(Function("cell", "range", "sum", "average", "abs", `return (${expression});`)(cell, range, sum, average, Math.abs));
  } catch {
    return null;
  }
}

function gerotYtd(row, rows, calculatedYtd = false, stack = new Set()) {
  if (!calculatedYtd && Object.prototype.hasOwnProperty.call(row, "referenceYtd")) return row.referenceYtd;
  if (calculatedYtd && row.ytdFormula) {
    const calculated = gerotSpreadsheetFormula(row, rows, row.ytdFormula, null, stack);
    if (Number.isFinite(calculated)) return calculated;
  }
  if (arrayValue(row.formulas).some(Boolean)) {
    const values = GEROT_MONTHS.map((_, index) => gerotSpreadsheetFormula(row, rows, arrayValue(row.formulas)[index], index, stack)).filter(Number.isFinite);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : row.referenceYtd;
  }
  if (row.ytdCalculation === "source-value") return row.referenceYtd;
  if (row.ytdCalculation === "average-monthly-result") {
    const results = GEROT_MONTHS.map((_, index) => gerotCalculatedValue(row, rows, index, calculatedYtd)).filter(Number.isFinite);
    return results.length ? results.reduce((sum, value) => sum + value, 0) / results.length : null;
  }
  if (arrayValue(row.formulaInputs).length) return gerotCalculatedValue(row, rows, null, calculatedYtd);
  const values = arrayValue(row.monthly)
    .filter((value) => value !== null && value !== undefined && value !== "")
    .map(Number)
    .filter(Number.isFinite);
  if (!values.length) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return row.aggregation === "sum" ? total : total / values.length;
}

function gerotCalculatedValue(row, rows, monthIndex, calculatedYtd = false) {
  const sourceInputsMatchPlan = monthIndex !== null && arrayValue(row.formulaInputs).every((id) => {
    const source = rows.find((item) => item.id === id);
    return Number(source?.monthly?.[monthIndex]) === Number(source?.sourceMonthly?.[monthIndex]);
  });
  if (monthIndex !== null && arrayValue(row.monthlySourceOverrides).includes(monthIndex) && sourceInputsMatchPlan) {
    const sourceResult = Number(row.monthly?.[monthIndex]);
    if (Number.isFinite(sourceResult)) return sourceResult;
  }
  const valueFor = (id) => {
    const source = rows.find((item) => item.id === id);
    if (monthIndex === null) return gerotYtd(source, rows, calculatedYtd);
    const value = source?.monthly?.[monthIndex];
    return value === null || value === undefined || value === "" ? null : Number(value);
  };
  const [a, b, c, d, e, f] = arrayValue(row.formulaInputs).map(valueFor);
  if (![a, b].every(Number.isFinite)) return null;
  const assistantHours = row.id === "pnp" && monthIndex === 0 ? 7.35 : monthIndex !== null && monthIndex >= 9 ? 7.83 : monthIndex !== null && monthIndex >= 7 ? 7.35 : 7.36;
  switch (row.id) {
    case "eficiencia-carregamento": case "aderencia-wms": case "matriz-priorizacao": return b ? a / b : null;
    case "eficiencia-descarga": return a + b ? a / (a + b) : null;
    case "stock-age": return a ? 1 - b / a : null;
    case "stock-age-curva-c": return a + b ? a / (a + b) : null;
    case "txr-armazem": return b ? 1 - a / b : null;
    case "wlp": return c && d ? c / ((a * assistantHours + b * 7.33) * d) : null;
    case "pnp": return a && b ? a / ((c * assistantHours + d * 7.33 + e * 8.33 + f * 8.08) * b) : null;
    case "fnp": return b ? a / b : null;
    case "tqi": return b ? a / b * 1000000 : null;
    case "pallets-avariados": return b ? a / b : null;
    default: return null;
  }
}

function gerotGoalClass(row, value) {
  if (row.goalMode === "none") return "neutral";
  if (!Number.isFinite(Number(value))) return "neutral";
  if (row.goalMode === "higher") return Number(value) >= Number(row.target) ? "success" : "danger";
  if (row.goalMode === "lower") return Number(value) <= Number(row.target) ? "success" : "danger";
  if (row.goalMode === "absolute") return Math.abs(Number(value)) <= Math.abs(Number(String(row.target).replace(/[^0-9.,-]/g, "").replace(",", "."))) ? "success" : "danger";
  return Number(value) >= Number(row.targetMin) && Number(value) <= Number(row.targetMax) ? "success" : "danger";
}

function gerotGoalLabel(row) {
  if (row.goalMode === "none") return "Memória";
  if (row.goalMode === "absolute") return String(row.target || "–");
  if (row.goalMode === "range") return `${gerotNumber(row.targetMin, row.unit, row.displayFormat)} a ${gerotNumber(row.targetMax, row.unit, row.displayFormat)}`;
  return gerotNumber(row.target, row.unit, row.displayFormat);
}

function gerotWarehouseView(data) {
  if (Array.isArray(data.areas)) {
    return `${moduleHeader("GEROT", "Quadro geral de indicadores operacionais por área.")}
      <section class="gerot-toolbar gerot-consultation"><div class="gerot-title-block"><span class="eyebrow">QUADRO DE CONSULTA</span><strong>GEROT 2026</strong><small>Selecione uma área para consultar os indicadores e suas memórias de cálculo.</small></div><label class="gerot-area-field"><span>Área</span><select data-gerot-area aria-label="Selecionar área do GEROT"><option>GERAL</option>${data.areas.map((area) => `<option>${escapeHtml(area.area)}</option>`).join("")}</select></label></section><section class="empty-state gerot-unavailable" data-gerot-unavailable><strong data-gerot-unavailable-title>Quadro geral</strong><p data-gerot-unavailable-copy>Escolha Armazém, Entrega, Controle ou Planejamento para abrir o quadro detalhado da área.</p></section>${data.areas.map((area) => `<div data-gerot-panel="${escapeHtml(area.area)}" hidden>${gerotWarehouseView({ ...area, embedded: true })}</div>`).join("")}`;
  }
  const months = GEROT_MONTHS;
  const allRows = arrayValue(data.rows);
  const indicatorCount = allRows.filter((row) => !row.calculationInput).length;
  const rowsById = new Map(allRows.map((row) => [row.id, row]));
  const renderedMemoryRows = new Set();
  const memoryRowsFor = (row, visited = new Set()) => arrayValue(row.formulaInputs).flatMap((id) => {
    if (visited.has(id)) return [];
    const memoryRow = rowsById.get(id);
    if (!memoryRow) return [];
    const nextVisited = new Set(visited).add(id);
    return [memoryRow, ...memoryRowsFor(memoryRow, nextVisited)];
  });
  const orderedRows = allRows.filter((row) => !row.calculationInput).flatMap((row) => {
    const memoryRows = memoryRowsFor(row);
    memoryRows.forEach((memoryRow) => renderedMemoryRows.add(memoryRow.id));
    return [row, ...memoryRows];
  });
  allRows.filter((row) => row.calculationInput && !renderedMemoryRows.has(row.id)).forEach((row) => orderedRows.push(row));
  const rows = orderedRows.map((row) => {
    const ytd = gerotYtd(row, allRows, Boolean(data.calculatedYtd));
    const monthly = months.map((month, index) => {
      const spreadsheetFormula = arrayValue(row.formulas)[index];
      const calculated = spreadsheetFormula && data.calculatedYtd ? gerotSpreadsheetFormula(row, allRows, spreadsheetFormula, index) : arrayValue(row.formulaInputs).length ? gerotCalculatedValue(row, allRows, index, Boolean(data.calculatedYtd)) : row.monthly?.[index];
      const value = calculated ?? row.monthly?.[index];
      const status = gerotGoalClass(row, value);
      const editable = !arrayValue(row.formulaInputs).length && !arrayValue(row.formulas).some(Boolean);
      return `<td class="gerot-value ${status}" data-label="${month}">${editable ? `<span class="gerot-result">${gerotNumber(value, row.unit, row.displayFormat)}</span><input data-gerot-input data-gerot-row="${escapeHtml(row.id)}" data-gerot-month="${index}" type="number" step="any" value="${value ?? ""}" disabled aria-label="${escapeHtml(row.indicator)} em ${month}">` : gerotNumber(value, row.unit, row.displayFormat)}</td>`;
    }).join("");
    return `<tr class="${row.calculationInput ? "gerot-memory-row" : ""}"><td>${escapeHtml(row.type)}</td><td><strong>${escapeHtml(row.indicator)}</strong></td><td>${escapeHtml(row.product)}</td><td>${escapeHtml(row.unit)}</td><td>${gerotNumber(row.eoy2024, row.unit, row.displayFormat)}</td><td>${gerotNumber(row.eoy2025, row.unit, row.displayFormat)}</td><td>${gerotGoalLabel(row)}</td><td class="gerot-value ${gerotGoalClass(row, ytd)}">${gerotNumber(ytd, row.unit, row.displayFormat)}</td>${monthly}</tr>`;
  }).join("");
  const canEdit = Boolean(data.canEdit);
  const ytdSummary = data.calculatedYtd ? "Acumulado recalculado a partir das memórias preenchidas." : "Acumulado inicial espelhado da planilha de referência.";
  return `
    ${data.embedded ? "" : moduleHeader("GEROT", "Quadro geral de indicadores operacionais.")}
    <section class="gerot-toolbar gerot-consultation"><div class="gerot-title-block"><span class="eyebrow">QUADRO DE CONSULTA</span><strong data-gerot-title>${escapeHtml(data.area || "ARMAZÉM")} · GEROT ${escapeHtml(data.year || 2026)}</strong><small data-gerot-summary data-gerot-default-summary="${escapeHtml(ytdSummary)}">${escapeHtml(ytdSummary)}</small></div><div class="gerot-toolbar-actions">${canEdit ? `<div class="gerot-editor-actions"><button class="button secondary" type="button" data-gerot-edit>Editar mês</button><button class="button primary" type="button" data-gerot-save hidden>Salvar alterações</button></div>` : ""}</div></section>
    <section class="gerot-summary-strip" data-gerot-details><span><strong>${indicatorCount}</strong> indicadores</span><span><strong>${escapeHtml(data.year || 2026)}</strong> competência</span><span>Visualização para todos os usuários</span>${!canEdit ? `<span>Edição exclusiva: ${escapeHtml(data.area || "Armazém")} e Gabriely</span>` : ""}</section>
    <section data-gerot-details><p class="gerot-legend"><span class="badge success">Meta atingida</span><span class="badge danger">Meta não atingida</span><span>Metas avaliadas conforme direção ou faixa definida na planilha.</span></p>
    <section class="table-card gerot-card"><div class="table-scroll"><table class="gerot-table"><thead><tr><th>Tipo</th><th>Indicador</th><th>Produto</th><th>Unidade</th><th>EOY 2024</th><th>EOY 2025</th><th>Meta 2026</th><th>YTD 2026</th>${months.map((month) => `<th>${month}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div></section></section>
    <section class="empty-state gerot-unavailable" data-gerot-unavailable hidden><strong data-gerot-unavailable-title>GEROT ainda não disponível</strong><p data-gerot-unavailable-copy>A planilha desta área será incluída assim que for importada.</p></section>
  `;
}

export const views = {
  dashboard: {
    title: "Dashboard",
    load: async (api, token) => {
      const dashboard = await api.dashboard(token);
      const presence = await api.presence(token, "dashboard");
      return { ...dashboard, presence };
    },
    render: (data, context) => dashboardView(data, context)
  },
  audit: {
    title: "Painel de auditoria",
    load: (api, token) => api.auditActions(token),
    render: (data, context) => auditPanelView(data, context)
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
    load: async (api, token) => {
      const [active, history] = await Promise.all([
        api.list(token, "/meetings"),
        api.list(token, "/meetings/history")
      ]);
      return { ...active, history: history.items || [] };
    },
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
    render: (data) => gerotWarehouseView(data)
  },
  notifications: {
    title: "Notificações",
    load: (api, token) => api.list(token, "/notifications"),
    render: (data) => notificationsView(data)
  }
};
