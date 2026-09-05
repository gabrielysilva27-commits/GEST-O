const DB_KEY = "lead-gestao-db-v2";

function readDb() {
  try {
    return JSON.parse(localStorage.getItem(DB_KEY) || "null");
  } catch {
    return null;
  }
}

function dtoRecords() {
  return (readDb()?.dtoRecords || []).filter(
    (record) => record?.recordType === "dto_application" && record.dtoTemplateId
  );
}

function installCompactStyles() {
  if (document.querySelector("style[data-dto-compact-styles]")) return;

  const style = document.createElement("style");
  style.dataset.dtoCompactStyles = "";
  style.textContent = `
    .dto2-view {
      gap: 7px !important;
    }

    .dto2-toolbar {
      min-height: 42px !important;
      padding: 6px 9px !important;
      gap: 8px !important;
      border-radius: 7px !important;
      box-shadow: none !important;
    }

    .dto2-toolbar h2 {
      font-size: .88rem !important;
      line-height: 1.15 !important;
    }

    .dto2-toolbar span {
      margin-top: 1px !important;
      font-size: .58rem !important;
      line-height: 1.2 !important;
    }

    .dto2-toolbar .button {
      min-height: 30px !important;
      padding: 5px 10px !important;
      font-size: .64rem !important;
    }

    .dto2-card.table-card,
    .dto2-view > .panel-card {
      display: block !important;
      padding: 8px 10px !important;
      border-radius: 7px !important;
      box-shadow: none !important;
    }

    .dto2-cardhead {
      align-items: center !important;
      margin: 0 0 5px !important;
      gap: 6px !important;
    }

    .dto2-cardhead h2 {
      margin: 0 !important;
      font-size: .79rem !important;
      line-height: 1.15 !important;
    }

    .dto2-cardhead span,
    .dto2-cardhead > strong {
      margin-top: 1px !important;
      font-size: .56rem !important;
      line-height: 1.2 !important;
    }

    .dto2-card .table-scroll {
      margin: 0 !important;
      padding: 0 !important;
    }

    .dto2-table {
      min-width: 700px !important;
    }

    .dto2-table th,
    .dto2-table td {
      padding: 5px 7px !important;
      line-height: 1.15 !important;
      vertical-align: middle !important;
    }

    .dto2-table th {
      font-size: .54rem !important;
      letter-spacing: .01em !important;
    }

    .dto2-table td {
      font-size: .63rem !important;
    }

    .dto2-table td strong {
      font-size: .63rem !important;
    }

    .dto2-chip,
    .dto2-rate {
      padding: 3px 6px !important;
      font-size: .55rem !important;
      line-height: 1 !important;
    }

    .dto2-filters {
      grid-template-columns: minmax(180px,1.5fr) repeat(3,minmax(105px,.8fr)) repeat(2,minmax(98px,.68fr)) auto !important;
      gap: 5px !important;
      margin: 0 0 6px !important;
      align-items: end !important;
    }

    .dto2-filters .field {
      gap: 2px !important;
    }

    .dto2-filters .field span {
      font-size: .54rem !important;
      line-height: 1 !important;
    }

    .dto2-filters input,
    .dto2-filters select {
      min-height: 29px !important;
      height: 29px !important;
      padding: 4px 7px !important;
      border-radius: 6px !important;
      font-size: .61rem !important;
    }

    .dto2-filters .button {
      min-height: 29px !important;
      height: 29px !important;
      padding: 4px 9px !important;
      font-size: .6rem !important;
    }

    .dto2-history tbody tr,
    .dto2-card:first-of-type tbody tr {
      height: 31px !important;
    }

    .dto2-arrow {
      width: 18px !important;
      padding-left: 2px !important;
      padding-right: 2px !important;
    }

    .dto2-info {
      gap: 5px !important;
    }

    .dto2-info > div {
      min-height: 44px !important;
      padding: 6px 7px !important;
      border-radius: 6px !important;
    }

    .dto2-info > div > span:first-child {
      font-size: .53rem !important;
    }

    .dto2-info > div > strong {
      margin-top: 2px !important;
      font-size: .63rem !important;
    }

    .dto2-action {
      min-height: 34px !important;
      padding: 7px 8px !important;
      font-size: .63rem !important;
      line-height: 1.35 !important;
    }

    .dto2-live {
      min-height: 52px !important;
      padding: 7px 9px !important;
      border-radius: 7px !important;
    }

    @media (max-width: 1180px) {
      .dto2-filters {
        grid-template-columns: repeat(3, minmax(140px, 1fr)) !important;
      }
    }

    @media (max-width: 760px) {
      .dto2-toolbar {
        align-items: center !important;
      }

      .dto2-filters {
        grid-template-columns: 1fr 1fr !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function addEmployeeToDeadlineTable() {
  if (location.hash !== "#dto") return;

  const cards = [...document.querySelectorAll("#page-content .dto2-card")];
  const card = cards.find((item) =>
    [...item.querySelectorAll("th")].some((th) => th.textContent.trim() === "Próximo vencimento")
  );
  const table = card?.querySelector("table.dto2-table");
  if (!table || table.dataset.dtoEmployeeColumn === "1") return;

  const headers = table.querySelectorAll("thead th");
  if (headers.length < 2) return;

  const employeeHeader = document.createElement("th");
  employeeHeader.textContent = "Funcionário";
  headers[1].insertAdjacentElement("afterend", employeeHeader);

  const records = dtoRecords();
  table.querySelectorAll("tbody tr").forEach((row) => {
    const recordId = Number(row.dataset.dto2Detail || 0);
    const record = records.find((item) => Number(item.id) === recordId);
    const cells = row.querySelectorAll("td");
    if (cells.length < 2) return;

    const employeeCell = document.createElement("td");
    employeeCell.textContent = String(record?.employeeName || "—");
    cells[1].insertAdjacentElement("afterend", employeeCell);
  });

  table.dataset.dtoEmployeeColumn = "1";
}

function compactDto() {
  installCompactStyles();
  addEmployeeToDeadlineTable();
}

const observer = new MutationObserver(() => compactDto());
observer.observe(document.documentElement, { childList: true, subtree: true });

window.addEventListener("hashchange", () => requestAnimationFrame(compactDto));
window.addEventListener("storage", () => requestAnimationFrame(compactDto));
document.addEventListener("DOMContentLoaded", compactDto);
requestAnimationFrame(compactDto);
