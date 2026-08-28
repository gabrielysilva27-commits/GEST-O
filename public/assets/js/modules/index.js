const MODULE_LABELS = {
  dashboard: "Dashboard",
  audit: "Painel de auditoria",
  actionPlans: "Planos de acao",
  meetings: "Reunioes",
  gapa: "GAPA",
  dto: "DTO - Diagnostico de tarefa operacional",
  anomalyReports: "Relato de anomalia",
  gerot: "GEROT",
  users: "Usuarios e permissoes",
  notifications: "Notificacoes",
  history: "Historico"
};

const VALUE_LABELS = {
  open: "Aberto",
  in_progress: "Em andamento",
  done: "Concluido",
  scheduled: "Agendada",
  held: "Realizada",
  follow_up: "Follow-up",
  analysis: "Em diagnostico",
  completed: "Concluido",
  resolved: "Resolvido",
  closed: "Encerrado",
  low: "Baixa",
  medium: "Media",
  high: "Alta",
  critical: "Critica"
};

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

function moduleHeader(title, description, actions = "") {
  return `
    <header class="module-header">
      <div>
        <span class="eyebrow">Modulo</span>
        <h2>${escapeHtml(title)}</h2>
        <p class="module-copy">${escapeHtml(description)}</p>
      </div>
      ${actions}
    </header>
  `;
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
            <p>Novos itens aparecerao aqui conforme voce comecar a usar este modulo.</p>
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
            <p>O historico comecara a aparecer conforme novos registros forem criados.</p>
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
  return item ? item.name : "Nao definido";
}

function getUserLabel(lookups, id) {
  const user = (lookups?.users || []).find((entry) => String(entry.id) === String(id));
  return user ? `${user.name} · @${user.username}` : "Nao definido";
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
      "Este modulo precisa de unidades cadastradas na base antes de receber novos registros."
    );
  }

  if (requiresUsers && users.length === 0) {
    return dependencyNotice(
      "Cadastros complementares pendentes",
      "Este modulo precisa de usuarios cadastrados antes de receber novos registros."
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

function dashboardView(data) {
  const overdueRows = (data.highlights?.overdueItems || []).map((item) => [
    escapeHtml(item.title),
    `<span class="badge info">${escapeHtml(item.module)}</span>`,
    escapeHtml(formatDate(item.dueDate)),
    statusBadge(item.status || "open")
  ]);

  const anomalyRows = (data.highlights?.priorityAnomalies || []).map((item) => [
    escapeHtml(item.title),
    escapeHtml(item.unitName || "Nao definida"),
    statusBadge(item.severity || "high"),
    statusBadge(item.status || "open")
  ]);

  return `
    ${moduleHeader("Dashboard operacional", "Acompanhe rapidamente o ritmo dos principais modulos da operacao.")}
    ${metricCards(data.kpis || [])}
    <div class="charts-grid">
      ${progressList("Planos de acao", "Leitura do andamento por status.", data.charts?.actionPlansByStatus || [], (item) => `${item.value} registros`)}
      ${progressList("Reunioes", "Agenda e desdobramentos do periodo.", data.charts?.meetingsByStatus || [], (item) => `${item.value} registros`)}
      ${progressList("Carga por modulo", "Volume atual nos modulos mais operacionais.", data.charts?.moduleLoad || [], (item) => `${item.value} registros`)}
      ${timelineCard("Historico recente", "Ultimos movimentos relevantes registrados na plataforma.", data.feed || [])}
    </div>
    <div class="split-layout">
      ${tableCard("Prazos em foco", "Itens vencidos ou que pedem atencao imediata.", ["Registro", "Modulo", "Prazo", "Status"], overdueRows)}
      ${tableCard("Anomalias prioritarias", "Relatos com severidade alta ou critica ainda em aberto.", ["Relato", "Unidade", "Severidade", "Status"], anomalyRows)}
    </div>
  `;
}

function auditPanelView(data) {
  const dashboard = data.dashboard || {};
  const notifications = data.notifications || { items: [], unreadCount: 0 };
  const history = data.history || { items: [] };

  const cards = [
    {
      label: "Nao lidas",
      value: notifications.unreadCount || 0,
      helper: "Notificacoes ainda pendentes"
    },
    {
      label: "Prazos vencidos",
      value: (dashboard.highlights?.overdueItems || []).length,
      helper: "Itens que pedem acao imediata"
    },
    {
      label: "Anomalias criticas",
      value: (dashboard.highlights?.priorityAnomalies || []).length,
      helper: "Ocorrencias de maior sensibilidade"
    },
    {
      label: "Movimentacoes",
      value: (history.items || []).length,
      helper: "Ultimos registros monitorados"
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
    ${moduleHeader("Painel de auditoria", "Consolide alertas, prazos e movimentacoes recentes em uma leitura unica.")}
    ${metricCards(cards)}
    <div class="split-layout">
      ${tableCard("Alertas recentes", "Visao rapida do que ainda merece acompanhamento.", ["Titulo", "Mensagem", "Quando", "Situacao"], alertRows)}
      ${tableCard("Movimentacoes monitoradas", "Ultimos registros relevantes para acompanhamento.", ["Modulo", "Descricao", "Quando"], movementRows)}
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
            <span>Nome de usuario</span>
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
        <button class="button primary" type="submit">Cadastrar usuario</button>
      </form>
    `
    : dependencyNotice(
        "Acesso somente para consulta",
        "Seu perfil pode visualizar os usuarios, mas nao pode cadastrar novos acessos por aqui."
      );

  return `
    ${moduleHeader("Usuarios e permissoes", "Cadastre acessos, senhas iniciais e perfis diretamente pela plataforma.")}
    <div class="split-layout">
      ${tableCard("Usuarios ativos", "Lista atual de acessos disponiveis.", ["Nome", "Usuario", "Perfil", "Status"], rows)}
      ${formCard("Novo usuario", "Crie um novo acesso com nome de usuario e senha inicial.", formContent)}
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
          "Seu perfil pode visualizar este modulo, mas nao pode criar registros por aqui."
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
    ${moduleHeader("Notificacoes", "Acompanhe alertas e mensagens direcionadas ao seu perfil.")}
    ${tableCard("Caixa de entrada", `${data.unreadCount || 0} notificacoes ainda nao lidas.`, ["Titulo", "Mensagem", "Quando", "Acao"], rows)}
  `;
}

function historyView(data) {
  return `
    ${moduleHeader("Historico", "Auditoria simples do que aconteceu na plataforma e quando aconteceu.")}
    ${timelineCard("Linha do tempo", "Eventos mais recentes registrados no sistema.", data.items || [])}
  `;
}

const actionPlansConfig = {
  title: "Planos de acao",
  description: "Estruture frentes, responsaveis e prazos em um fluxo claro de execucao.",
  tableTitle: "Carteira de planos",
  tableDescription: "Planos de acao acessiveis ao seu perfil.",
  headers: ["Plano", "Unidade", "Responsavel", "Prazo", "Prioridade", "Status"],
  formTitle: "Novo plano de acao",
  formDescription: "Abra uma frente com objetivo claro e dono definido.",
  dependencies: { requiresUnits: true, requiresUsers: true },
  managePermission: "actionPlans.manage",
  columns: [
    (item) => escapeHtml(item.title),
    (item, context) => escapeHtml(getLookupName(context.lookups, "units", item.unitId)),
    (item, context) => escapeHtml(getUserLabel(context.lookups, item.ownerId)),
    (item) => escapeHtml(formatDate(item.dueDate)),
    (item) => statusBadge(item.priority || "medium"),
    (item) => statusBadge(item.status || "open")
  ],
  form(context) {
    return `
      <form class="stack" data-form="actionPlans">
        <label class="field">
          <span>Titulo do plano</span>
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
            <span>Responsavel</span>
            <select name="ownerId" required>${optionList(context.lookups.users)}</select>
          </label>
          <label class="field">
            <span>Prioridade</span>
            <select name="priority">
              <option value="low">Baixa</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="critical">Critica</option>
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

const meetingsConfig = {
  title: "Reunioes",
  description: "Organize pautas, responsaveis e desdobramentos em uma agenda mais objetiva.",
  tableTitle: "Agenda de reunioes",
  tableDescription: "Reunioes previstas e registradas dentro do seu escopo.",
  headers: ["Reuniao", "Unidade", "Data", "Conducao", "Status"],
  formTitle: "Nova reuniao",
  formDescription: "Registre um encontro, sua pauta central e o responsavel pela conducao.",
  dependencies: { requiresUnits: true, requiresUsers: true },
  managePermission: "meetings.manage",
  columns: [
    (item) => escapeHtml(item.title),
    (item, context) => escapeHtml(getLookupName(context.lookups, "units", item.unitId)),
    (item) => escapeHtml(formatDate(item.scheduledAt)),
    (item, context) => escapeHtml(getUserLabel(context.lookups, item.ownerId)),
    (item) => statusBadge(item.status || "scheduled")
  ],
  form(context) {
    return `
      <form class="stack" data-form="meetings">
        <label class="field">
          <span>Titulo da reuniao</span>
          <input name="title" required>
        </label>
        <label class="field">
          <span>Pauta principal</span>
          <textarea name="objective" placeholder="O que precisa ser alinhado ou decidido"></textarea>
        </label>
        <div class="form-grid">
          <label class="field">
            <span>Unidade</span>
            <select name="unitId" required>${optionList(context.lookups.units)}</select>
          </label>
          <label class="field">
            <span>Conducao</span>
            <select name="ownerId" required>${optionList(context.lookups.users)}</select>
          </label>
          <label class="field">
            <span>Data</span>
            <input type="date" name="scheduledAt" required>
          </label>
          <label class="field">
            <span>Status</span>
            <select name="status">
              <option value="scheduled">Agendada</option>
              <option value="held">Realizada</option>
              <option value="follow_up">Follow-up</option>
            </select>
          </label>
        </div>
        <button class="button primary" type="submit">Registrar reuniao</button>
      </form>
    `;
  }
};

const gapaConfig = {
  title: "GAPA",
  description: "Centralize registros GAPA, frentes em andamento e responsaveis pela tratativa.",
  tableTitle: "Registros GAPA",
  tableDescription: "Itens GAPA disponiveis para acompanhamento do seu perfil.",
  headers: ["Registro", "Categoria", "Unidade", "Responsavel", "Status"],
  formTitle: "Novo registro GAPA",
  formDescription: "Abra um registro com contexto, dono e proximo passo definidos.",
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
          <span>Titulo do registro</span>
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
            <span>Responsavel</span>
            <select name="ownerId" required>${optionList(context.lookups.users)}</select>
          </label>
          <label class="field">
            <span>Status</span>
            <select name="status">
              <option value="open">Aberto</option>
              <option value="in_progress">Em andamento</option>
              <option value="done">Concluido</option>
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
  title: "DTO - Diagnostico de tarefa operacional",
  description: "Registre o diagnostico, o responsavel e o proximo passo para cada tratativa operacional.",
  tableTitle: "Diagnosticos operacionais",
  tableDescription: "DTOs ativos ou recentemente atualizados no seu escopo.",
  headers: ["Diagnostico", "Unidade", "Responsavel", "Prazo", "Status"],
  formTitle: "Novo DTO",
  formDescription: "Formalize um diagnostico de tarefa operacional com clareza e rastreabilidade.",
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
          <span>Titulo do diagnostico</span>
          <input name="title" required>
        </label>
        <label class="field">
          <span>Diagnostico</span>
          <textarea name="diagnosis" placeholder="Descreva causa, impacto e direcionamento"></textarea>
        </label>
        <div class="form-grid">
          <label class="field">
            <span>Unidade</span>
            <select name="unitId" required>${optionList(context.lookups.units)}</select>
          </label>
          <label class="field">
            <span>Responsavel</span>
            <select name="ownerId" required>${optionList(context.lookups.users)}</select>
          </label>
          <label class="field">
            <span>Prazo</span>
            <input type="date" name="dueDate" required>
          </label>
          <label class="field">
            <span>Status</span>
            <select name="status">
              <option value="analysis">Em diagnostico</option>
              <option value="in_progress">Em andamento</option>
              <option value="completed">Concluido</option>
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
    (item) => escapeHtml(item.source || "Operacao"),
    (item, context) => escapeHtml(getLookupName(context.lookups, "units", item.unitId)),
    (item) => statusBadge(item.severity || "medium"),
    (item) => statusBadge(item.status || "open")
  ],
  form(context) {
    return `
      <form class="stack" data-form="anomalyReports">
        <label class="field">
          <span>Titulo do relato</span>
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
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="critical">Critica</option>
            </select>
          </label>
          <label class="field">
            <span>Prazo</span>
            <input type="date" name="dueDate">
          </label>
        </div>
        <label class="field">
          <span>Descricao</span>
          <textarea name="description" placeholder="Descreva a anomalia e o impacto observado"></textarea>
        </label>
        <button class="button primary" type="submit">Registrar anomalia</button>
      </form>
    `;
  }
};

const gerotConfig = {
  title: "GEROT",
  description: "Acompanhe registros, frentes e encaminhamentos do GEROT em uma trilha unica.",
  tableTitle: "Registros GEROT",
  tableDescription: "Itens GEROT ativos no seu escopo.",
  headers: ["Registro", "Frente", "Unidade", "Responsavel", "Status"],
  formTitle: "Novo registro GEROT",
  formDescription: "Abra um registro GEROT com responsavel definido e prazo claro.",
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
          <span>Titulo do registro</span>
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
            <span>Responsavel</span>
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
          <span>Observacoes</span>
          <textarea name="notes" placeholder="Registre contexto, tratativa e proximo passo"></textarea>
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
  actionPlans: {
    title: "Planos de acao",
    load: (api, token) => api.list(token, "/action-plans"),
    render: (data, context) => operationsView(actionPlansConfig, data, context)
  },
  meetings: {
    title: "Reunioes",
    load: (api, token) => api.list(token, "/meetings"),
    render: (data, context) => operationsView(meetingsConfig, data, context)
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
    title: "Usuarios e permissoes",
    load: (api, token) => api.list(token, "/users"),
    render: (data, context) => usersView(data, context)
  },
  notifications: {
    title: "Notificacoes",
    load: (api, token) => api.list(token, "/notifications"),
    render: (data) => notificationsView(data)
  },
  history: {
    title: "Historico",
    load: (api, token) => api.list(token, "/history"),
    render: (data) => historyView(data)
  }
};
