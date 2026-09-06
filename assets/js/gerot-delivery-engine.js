// A small, non-eval Excel interpreter for the formulas present in GEROT Entrega.
// Blank cells, formula strings, zero and errors remain distinct during evaluation.
const parsedFormulas = new Map();

function parseFormula(formula) {
  if (parsedFormulas.has(formula)) return parsedFormulas.get(formula);
  const source = String(formula).replace(/^=/, "").replace(/\$/g, "");
  const tokens = [];
  let offset = 0;
  while (offset < source.length) {
    const match = source.slice(offset).match(/^\s*("(?:[^"]|"")*"|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[A-Za-z_][A-Za-z_0-9]*|<>|<=|>=|[+*/^(),:=<>%-])/);
    if (!match) throw new Error(`Fórmula não suportada: ${formula}`);
    tokens.push(match[1]); offset += match[0].length;
  }
  let position = 0;
  const take = (token) => tokens[position] === token && (++position, true);
  const expect = (token) => { if (!take(token)) throw new Error(`Esperado ${token}`); };
  const priority = { "=": 1, "<>": 1, "<": 1, ">": 1, "<=": 1, ">=": 1, "+": 2, "-": 2, "*": 3, "/": 3, "^": 4 };
  function atom() {
    if (take("+")) return { kind: "unary", op: "+", value: atom() };
    if (take("-")) return { kind: "unary", op: "-", value: atom() };
    if (take("(")) { const value = expression(); expect(")"); return value; }
    const token = tokens[position++];
    if (token?.startsWith('"')) return { kind: "literal", value: token.slice(1, -1).replace(/""/g, '"') };
    if (/^(\d|\.)/.test(token || "")) return { kind: "literal", value: Number(token) };
    if (/^[A-Z]+\d+$/i.test(token || "")) {
      if (take(":")) return { kind: "range", from: token.toUpperCase(), to: tokens[position++].toUpperCase() };
      return { kind: "cell", address: token.toUpperCase() };
    }
    if (/^[A-Z_]+$/i.test(token || "")) {
      expect("("); const args = [];
      if (!take(")")) { do { args.push(expression()); } while (take(",")); expect(")"); }
      return { kind: "call", name: token.toUpperCase(), args };
    }
    throw new Error("Expressão inválida");
  }
  function expression(min = 0) {
    let left = atom();
    if (take("%")) left = { kind: "binary", op: "/", left, right: { kind: "literal", value: 100 } };
    while (priority[tokens[position]] && priority[tokens[position]] >= min) {
      const op = tokens[position++];
      left = { kind: "binary", op, left, right: expression(priority[op] + (op === "^" ? 0 : 1)) };
    }
    return left;
  }
  const tree = expression();
  if (position !== tokens.length) throw new Error("Fórmula incompleta");
  parsedFormulas.set(formula, tree);
  return tree;
}

function number(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === "boolean") return Number(value);
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("#VALUE!");
  return value;
}

function coordinates(address) {
  const match = address.match(/^([A-Z]+)(\d+)$/);
  if (!match) throw new Error("#REF!");
  let column = 0;
  for (const character of match[1]) column = column * 26 + character.charCodeAt(0) - 64;
  return { column, row: Number(match[2]) };
}

export function createDeliveryCalculator(rows) {
  const byRow = new Map(rows.map((row) => [Number(row.sheetRow), row]));
  const cache = new Map();
  const active = new Set();
  function evaluate(node) {
    if (node.kind === "literal") return node.value;
    if (node.kind === "cell") return rawCell(node.address);
    if (node.kind === "range") {
      const from = coordinates(node.from), to = coordinates(node.to), values = [];
      for (let row = from.row; row <= to.row; row++) {
        for (let col = from.column; col <= to.column; col++) values.push(rawCell(`${String.fromCharCode(64 + col)}${row}`));
      }
      return values;
    }
    if (node.kind === "unary") return number(evaluate(node.value)) * (node.op === "-" ? -1 : 1);
    if (node.kind === "binary") {
      const a = number(evaluate(node.left)), b = number(evaluate(node.right));
      switch (node.op) {
        case "+": return a + b; case "-": return a - b; case "*": return a * b;
        case "/": if (!b) throw new Error("#DIV/0!"); return a / b;
        case "^": return a ** b;
        case "=": return a === b; case "<>": return a !== b;
        case "<": return a < b; case ">": return a > b;
        case "<=": return a <= b; case ">=": return a >= b;
      }
    }
    if (node.kind === "call") {
      if (node.name === "IFERROR") { try { return evaluate(node.args[0]); } catch { return evaluate(node.args[1]); } }
      if (node.name === "IF") return evaluate(node.args[evaluate(node.args[0]) ? 1 : 2]);
      if (node.name === "ABS") return Math.abs(number(evaluate(node.args[0])));
      if (node.name === "SUM" || node.name === "AVERAGE") {
        const values = node.args.flatMap((arg) => evaluate(arg)).filter((value) => typeof value === "number" && Number.isFinite(value));
        const sum = values.reduce((total, value) => total + value, 0);
        if (node.name === "SUM") return sum;
        if (!values.length) throw new Error("#DIV/0!");
        return sum / values.length;
      }
    }
    throw new Error("Função não suportada");
  }
  function rawCell(address) {
    if (cache.has(address)) {
      const value = cache.get(address); if (value instanceof Error) throw value; return value;
    }
    if (active.has(address)) throw new Error("Referência circular");
    const { column, row: rowNumber } = coordinates(address);
    const row = byRow.get(rowNumber);
    if (!row || column < 14 || column > 26) throw new Error(`#REF! ${address}`);
    const index = column - 15;
    const formula = column === 14 ? row.ytdFormula : row.formulas?.[index];
    active.add(address);
    try {
      const value = formula ? evaluate(parseFormula(formula)) : column === 14 ? row.referenceYtd : row.monthly?.[index] ?? null;
      if (typeof value === "number" && !Number.isFinite(value)) throw new Error("#NUM!");
      cache.set(address, value); return value;
    } catch (error) { cache.set(address, error); throw error; }
    finally { active.delete(address); }
  }
  return {
    cell(address) { try { const value = rawCell(address); return typeof value === "number" && Number.isFinite(value) ? value : null; } catch { return null; } },
    value(row, month = null) {
      if (!row.sheetRow) {
        if (month !== null) return typeof row.monthly?.[month] === "number" ? row.monthly[month] : null;
        const values = (row.monthly || []).filter((value) => typeof value === "number" && Number.isFinite(value));
        return values.length ? values.reduce((sum, value) => sum + value, 0) / (row.aggregation === "sum" ? 1 : values.length) : null;
      }
      return this.cell(`${month === null ? "N" : String.fromCharCode(79 + month)}${row.sheetRow}`);
    },
    rawCell
  };
}

export function deliveryCellKind(row, month = 0) {
  const format = row.formats?.[month] || row.displayFormat || row.unit || "General";
  if (row.unit === "HORA" || /\[h\]|h:mm/i.test(format)) return "time";
  return format.includes("%") ? "percent" : "number";
}

export function deliveryInputValue(value, kind) {
  if (value === null || value === undefined || value === "") return "";
  if (kind === "time") {
    const seconds = Math.round(Number(value) * 86400);
    return `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }
  return String(Number((Number(value) * (kind === "percent" ? 100 : 1)).toPrecision(15))).replace(".", ",");
}

export function parseDeliveryInput(text, kind) {
  const value = String(text).trim();
  if (!value) return null;
  if (kind === "time") {
    const match = value.match(/^(\d+):([0-5]\d)(?::([0-5]\d))?$/);
    if (!match) throw new Error("Preencha a duração como 08:30 ou 08:30:00.");
    return (Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3] || 0)) / 86400;
  }
  let normalized = value.replace(/\s/g, "");
  if (kind === "percent") normalized = normalized.replace(/%$/, "");
  if (normalized.includes(",")) normalized = normalized.replace(/\./g, "").replace(",", ".");
  else if (/^[+-]?\d{1,3}(\.\d{3})+$/.test(normalized)) normalized = normalized.replace(/\./g, "");
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(normalized) || !Number.isFinite(Number(normalized))) throw new Error("Informe um número válido, por exemplo 1.234,56.");
  return Number(normalized) / (kind === "percent" ? 100 : 1);
}
