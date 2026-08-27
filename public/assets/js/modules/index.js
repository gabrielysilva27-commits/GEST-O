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

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: value.includes("T") ? "short" : undefined
  }).format(date);
}

function moduleHeader(title, description, actions = "") {
  return `
    <header class="module-header">
      <div>
        <span class="eyebrow">Módulo</span>
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
        ${items.map((item) => `
          <li>
            <div class="row">
              <strong>${escapeHtml(item.label)}</strong>
              <span>${escapeHtml(formatter(item))}</span>
            </div>
            <div class="bar-track">
              <div class="bar-fill" style="width: ${Math.max(4, Number(item.value) || 0)}%"></div>
            </div>
          </li>
        `).join("")}
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
            <p>Novos itens aparecerão aqui conforme você começar a usar a plataforma.</p>
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
              ${item.module ? `<span class="badge info">${escapeHtml(item.module)}</span>` : ""}
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

function getUserLabel(lookups, id) {
  const user = (lookups?.users || []).find((entry) => String(entry.id) === String(id));
  return user ? `${user.name} · @${user.username}` : "Não definido";
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

function dashboardView(data) {
  const overdueRows = (data.highlights?.overdueTasks || []).map((item) => [
    escapeHtml(item.title),
    `<span class="badge ${badgeClass(item.priority)}">${escapeHtml(item.priority)}</span>`,
    escapeHtml(formatDate(item.dueDate))
  ]);

  const safetyRows = (data.highlights?.urgentSafetyItems || []).map((item) => [
    escapeHtml(item.title),
    `<span class="badge ${badgeClass(item.severity)}">${escapeHtml(item.severity)}</span>`,
    `<span class="badge ${badgeClass(item.status)}">${escapeHtml(item.status)}</span>`
  ]);

  return `
    ${moduleHeader("Dashboard operacional", "Acompanhe rapidamente volume, criticidade e andamento da operação.")}
    ${metricCards(data.kpis || [])}
    <div class="charts-grid">
      ${progressList("Fluxo de tarefas", "Distribuição das atividades por status.", data.charts?.tasksByStatus || [], (item) => `${item.value} itens`)}
      ${progressList("Ocorrências de segurança", "Leitura dos relatos por severidade.", data.charts?.safetyBySeverity || [], (item) => `${item.value} registros`)}
      ${progressList("Treinamentos", "Percentual de conclusão por ação.", data.charts?.trainingCompletion || [], (item) => `${item.value}%`)}
      ${timelineCard("Histórico recente", "Últimos eventos relevantes registrados na plataforma.", data.feed || [])}
    </div>
    <div class="split-layout">
      ${tableCard("Tarefas vencidas", "Demandas que exigem atenção imediata.", ["Tarefa", "Prioridade", "Vencimento"], overdueRows)}
      ${tableCard("Segurança em foco", "Ocorrências críticas ou altas ainda abertas.", ["Relato", "Severidade", "Status"], safetyRows)}
    </div>
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

  return `
    ${moduleHeader("Usuários e permissões", "Cadastre acessos, senhas iniciais e perfis diretamente pela plataforma.")}
    <div class="split-layout">
      ${tableCard("Usuários ativos", "Lista atual de acessos disponíveis.", ["Nome", "Usuário", "Perfil", "Status"], rows)}
      ${formCard("Novo usuário", "Crie um novo acesso com nome de usuário e senha inicial.", `
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
      `)}
    </div>
  `;
}

function operationsView(config, data, context) {
  const rows = (data.items || []).map((item) => config.columns.map((column) => column(item, context)));
  const blocked = getDependencyState(context, config.dependencies);

  return `
    ${moduleHeader(config.title, config.description, config.actions || "")}
    <div class="split-layout">
      ${tableCard(config.tableTitle, config.tableDescription, config.headers, rows)}
      ${formCard(config.formTitle, config.formDescription, blocked || config.form(context))}
    </div>
  `;
}

function reportsView(data) {
  const cards = (data.cards || []).map((card) => ({
    label: card.label,
    value: `${card.value}${card.unit || ""}`,
    helper: "Consolidado para leitura gerencial"
  }));

  return `
    ${moduleHeader("Relatórios e exportações", "Consulte indicadores consolidados e exporte dados em CSV.", `
      <div class="stack">
        <button class="button secondary" type="button" data-export="tasks">Exportar tarefas</button>
        <button class="button secondary" type="button" data-export="checklists">Exportar checklists</button>
        <button class="button secondary" type="button" data-export="safetyReports">Exportar segurança</button>
        <button class="button secondary" type="button" data-export="trainings">Exportar treinamentos</button>
        <button class="button secondary" type="button" data-export="tickets">Exportar chamados</button>
      </div>
    `)}
    ${metricCards(cards)}
    <div class="split-layout">
      ${tableCard("Tarefas", "Resumo por estágio da execução.", ["Abertas", "Em andamento", "Concluídas"], [[
        escapeHtml(data.breakdown?.tasks?.open ?? 0),
        escapeHtml(data.breakdown?.tasks?.inProgress ?? 0),
        escapeHtml(data.breakdown?.tasks?.done ?? 0)
      ]])}
      ${tableCard("Segurança e treinamentos", "Leitura rápida para acompanhamento.", ["Relatos resolvidos", "Treinamentos agendados", "Treinamentos em andamento"], [[
        escapeHtml(data.breakdown?.safety?.resolved ?? 0),
        escapeHtml(data.breakdown?.trainings?.scheduled ?? 0),
        escapeHtml(data.breakdown?.trainings?.inProgress ?? 0)
      ]])}
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

const taskConfig = {
  title: "Tarefas",
  description: "Organize entregas, responsáveis, prioridades e vencimentos em um único fluxo.",
  tableTitle: "Backlog operacional",
  tableDescription: "Tarefas acessíveis ao seu perfil.",
  headers: ["Tarefa", "Responsável", "Unidade", "Prioridade", "Vencimento", "Status"],
  formTitle: "Nova tarefa",
  formDescription: "Crie uma atividade e direcione-a ao responsável correto.",
  dependencies: { requiresUnits: true, requiresUsers: true },
  columns: [
    (item) => escapeHtml(item.title),
    (item, context) => escapeHtml(getUserLabel(context.lookups, item.assigneeId)),
    (item, context) => escapeHtml(getLookupName(context.lookups, "units", item.unitId)),
    (item) => `<span class="badge ${badgeClass(item.priority)}">${escapeHtml(item.priority)}</span>`,
    (item) => escapeHtml(formatDate(item.dueDate)),
    (item) => `<span class="badge ${badgeClass(item.status)}">${escapeHtml(item.status)}</span>`
  ],
  form(context) {
    return `
      <form class="stack" data-form="tasks">
        <label class="field">
          <span>Título</span>
          <input name="title" required>
        </label>
        <label class="field">
          <span>Descrição</span>
          <textarea name="description"></textarea>
        </label>
        <div class="form-grid">
          <label class="field">
            <span>Unidade</span>
            <select name="unitId" required>${optionList(context.lookups.units)}</select>
          </label>
          <label class="field">
            <span>Responsável</span>
            <select name="assigneeId" required>${optionList(context.lookups.users)}</select>
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
            <span>Vencimento</span>
            <input type="date" name="dueDate" required>
          </label>
        </div>
        <button class="button primary" type="submit">Criar tarefa</button>
      </form>
    `;
  }
};

const checklistConfig = {
  title: "Checklists personalizados",
  description: "Crie rotinas padronizadas e acompanhe conformidade por unidade.",
  tableTitle: "Checklists ativos",
  tableDescription: "Modelos disponíveis para a operação.",
  headers: ["Checklist", "Categoria", "Unidades", "Conformidade", "Última execução"],
  formTitle: "Novo checklist",
  formDescription: "Monte um checklist com itens claros e objetivos.",
  dependencies: { requiresUnits: true },
  columns: [
    (item) => escapeHtml(item.name),
    (item) => escapeHtml(item.category),
    (item, context) => escapeHtml((item.unitIds || []).map((id) => getLookupName(context.lookups, "units", id)).join(", ")),
    (item) => `<span class="badge info">${escapeHtml(item.complianceRate ?? 0)}%</span>`,
    (item) => escapeHtml(formatDate(item.lastRunAt))
  ],
  form(context) {
    return `
      <form class="stack" data-form="checklists">
        <label class="field">
          <span>Nome</span>
          <input name="name" required>
        </label>
        <div class="form-grid">
          <label class="field">
            <span>Categoria</span>
            <input name="category" required placeholder="Segurança, operação, qualidade...">
          </label>
          <label class="field">
            <span>Unidade</span>
            <select name="unitIds" required>${optionList(context.lookups.units)}</select>
          </label>
        </div>
        <label class="field">
          <span>Itens do checklist</span>
          <textarea name="items" placeholder="Um item por linha" required></textarea>
        </label>
        <button class="button primary" type="submit">Criar checklist</button>
      </form>
    `;
  }
};

const safetyConfig = {
  title: "Relatos de segurança",
  description: "Registre desvios, quase acidentes e oportunidades de melhoria com rastreabilidade.",
  tableTitle: "Ocorrências registradas",
  tableDescription: "Relatos acessíveis dentro do seu escopo.",
  headers: ["Relato", "Unidade", "Severidade", "Prazo", "Status"],
  formTitle: "Novo relato",
  formDescription: "Capture a ocorrência com clareza para facilitar a tratativa.",
  dependencies: { requiresUnits: true },
  columns: [
    (item) => escapeHtml(item.title),
    (item, context) => escapeHtml(getLookupName(context.lookups, "units", item.unitId)),
    (item) => `<span class="badge ${badgeClass(item.severity)}">${escapeHtml(item.severity)}</span>`,
    (item) => escapeHtml(formatDate(item.dueDate)),
    (item) => `<span class="badge ${badgeClass(item.status)}">${escapeHtml(item.status)}</span>`
  ],
  form(context) {
    return `
      <form class="stack" data-form="safety">
        <label class="field">
          <span>Título</span>
          <input name="title" required>
        </label>
        <div class="form-grid">
          <label class="field">
            <span>Tipo</span>
            <select name="type">
              <option value="Desvio">Desvio</option>
              <option value="Quase acidente">Quase acidente</option>
              <option value="Comportamento">Comportamento</option>
            </select>
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
          <textarea name="description"></textarea>
        </label>
        <button class="button primary" type="submit">Registrar relato</button>
      </form>
    `;
  }
};

const trainingsConfig = {
  title: "Treinamentos",
  description: "Planeje formações, defina participantes e acompanhe o andamento.",
  tableTitle: "Agenda de treinamentos",
  tableDescription: "Treinamentos ativos no seu escopo.",
  headers: ["Treinamento", "Unidade", "Data", "Instrutor", "Status"],
  formTitle: "Novo treinamento",
  formDescription: "Cadastre uma ação formativa com rapidez.",
  dependencies: { requiresUnits: true, requiresUsers: true },
  columns: [
    (item) => escapeHtml(item.title),
    (item, context) => escapeHtml(getLookupName(context.lookups, "units", item.unitId)),
    (item) => escapeHtml(formatDate(item.dueDate)),
    (item) => escapeHtml(item.instructor),
    (item) => `<span class="badge ${badgeClass(item.status)}">${escapeHtml(item.status)}</span>`
  ],
  form(context) {
    return `
      <form class="stack" data-form="trainings">
        <label class="field">
          <span>Título</span>
          <input name="title" required>
        </label>
        <div class="form-grid">
          <label class="field">
            <span>Categoria</span>
            <input name="category" placeholder="Segurança, qualidade, operação">
          </label>
          <label class="field">
            <span>Unidade</span>
            <select name="unitId" required>${optionList(context.lookups.units)}</select>
          </label>
          <label class="field">
            <span>Data</span>
            <input type="date" name="dueDate" required>
          </label>
          <label class="field">
            <span>Instrutor</span>
            <input name="instructor">
          </label>
        </div>
        <label class="field">
          <span>Participante</span>
          <select name="participantIds">${optionList(context.lookups.users)}</select>
        </label>
        <button class="button primary" type="submit">Cadastrar treinamento</button>
      </form>
    `;
  }
};

const ticketsConfig = {
  title: "Chamados",
  description: "Centralize demandas operacionais, técnicas e administrativas.",
  tableTitle: "Fila de chamados",
  tableDescription: "Chamados acompanhados na plataforma.",
  headers: ["Chamado", "Categoria", "Unidade", "Prioridade", "Status"],
  formTitle: "Novo chamado",
  formDescription: "Abra uma demanda e defina quem cuidará da tratativa.",
  dependencies: { requiresUnits: true, requiresUsers: true },
  columns: [
    (item) => escapeHtml(item.title),
    (item) => escapeHtml(item.category),
    (item, context) => escapeHtml(getLookupName(context.lookups, "units", item.unitId)),
    (item) => `<span class="badge ${badgeClass(item.priority)}">${escapeHtml(item.priority)}</span>`,
    (item) => `<span class="badge ${badgeClass(item.status)}">${escapeHtml(item.status)}</span>`
  ],
  form(context) {
    return `
      <form class="stack" data-form="tickets">
        <label class="field">
          <span>Título</span>
          <input name="title" required>
        </label>
        <div class="form-grid">
          <label class="field">
            <span>Categoria</span>
            <input name="category" placeholder="Infraestrutura, acessos, qualidade">
          </label>
          <label class="field">
            <span>Unidade</span>
            <select name="unitId" required>${optionList(context.lookups.units)}</select>
          </label>
          <label class="field">
            <span>Prioridade</span>
            <select name="priority">
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
            </select>
          </label>
          <label class="field">
            <span>Dono do chamado</span>
            <select name="ownerId">${optionList(context.lookups.users)}</select>
          </label>
        </div>
        <label class="field">
          <span>Descrição</span>
          <textarea name="description"></textarea>
        </label>
        <button class="button primary" type="submit">Abrir chamado</button>
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
  users: {
    title: "Usuários e permissões",
    load: (api, token) => api.list(token, "/users"),
    render: (data, context) => usersView(data, context)
  },
  tasks: {
    title: "Tarefas",
    load: (api, token) => api.list(token, "/tasks"),
    render: (data, context) => operationsView(taskConfig, data, context)
  },
  checklists: {
    title: "Checklists",
    load: (api, token) => api.list(token, "/checklists"),
    render: (data, context) => operationsView(checklistConfig, data, context)
  },
  safety: {
    title: "Segurança",
    load: (api, token) => api.list(token, "/safety-reports"),
    render: (data, context) => operationsView(safetyConfig, data, context)
  },
  trainings: {
    title: "Treinamentos",
    load: (api, token) => api.list(token, "/trainings"),
    render: (data, context) => operationsView(trainingsConfig, data, context)
  },
  tickets: {
    title: "Chamados",
    load: (api, token) => api.list(token, "/tickets"),
    render: (data, context) => operationsView(ticketsConfig, data, context)
  },
  reports: {
    title: "Relatórios",
    load: (api, token) => api.list(token, "/reports/summary"),
    render: (data) => reportsView(data)
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
