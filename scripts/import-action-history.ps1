param(
  [string]$SourcePath = "",
  [string]$ReportPath = "C:\Users\gabri\Downloads\ACOES_NAO_INSERIDAS_POR_REQUISITOS.xlsx",
  [string]$OutputPath = "assets\js\imported-action-history-additions.js"
)

$ErrorActionPreference = "Stop"

if (-not $SourcePath) {
  $SourcePath = (Get-ChildItem -LiteralPath "C:\Users\gabri\Downloads" -File |
    Where-Object { $_.Extension -eq ".xlsx" -and $_.Length -eq 468574 } |
    Select-Object -First 1 -ExpandProperty FullName)
}

if (-not $SourcePath) {
  throw "A planilha de ações não foi encontrada em Downloads."
}

function Normalize-Value([string]$Value) {
  $text = $Value.Trim().Normalize([Text.NormalizationForm]::FormD)
  $text = -join ($text.ToCharArray() | Where-Object {
    [Globalization.CharUnicodeInfo]::GetUnicodeCategory($_) -ne [Globalization.UnicodeCategory]::NonSpacingMark
  })
  return ($text -replace "[^a-zA-Z0-9]+", " ").Trim().ToLowerInvariant()
}

function Convert-ExcelDate($Value) {
  if ($null -eq $Value -or [string]::IsNullOrWhiteSpace([string]$Value)) {
    return ""
  }

  if ($Value -is [double] -or $Value -is [int]) {
    return [DateTime]::FromOADate([double]$Value).ToString("yyyy-MM-dd")
  }

  $parsed = [DateTime]::MinValue
  if ([DateTime]::TryParse([string]$Value, [Globalization.CultureInfo]::GetCultureInfo("pt-BR"), [Globalization.DateTimeStyles]::None, [ref]$parsed)) {
    return $parsed.ToString("yyyy-MM-dd")
  }

  return [string]$Value
}

function Convert-LegacyStatus([string]$Value) {
  $status = Normalize-Value $Value
  if ($status -like "*concluido*" -or $status -like "*realizado*") {
    return "done"
  }
  if ($status -like "*andamento*") {
    return "in_progress"
  }
  return "open"
}

function Convert-DeadlineFromDuration([string]$OpenedAt, [string]$Duration) {
  if (-not $OpenedAt) {
    return ""
  }

  $daysMatch = [regex]::Match($Duration, "\d+")
  if (-not $daysMatch.Success) {
    return $OpenedAt
  }

  $openedDate = [DateTime]::ParseExact($OpenedAt, "yyyy-MM-dd", [Globalization.CultureInfo]::InvariantCulture)
  return $openedDate.AddDays([int]$daysMatch.Value).ToString("yyyy-MM-dd")
}

$meetingMap = @{
  "mpr armazem" = @{ Title = "MPR Armazém_Controle"; TemplateId = 2 }
  "rps armazem" = @{ Title = "RPS Armazém_Controle"; TemplateId = 3 }
  "team room distribuicao" = @{ Title = "Team Room Distribuição"; TemplateId = 10 }
  "team room god" = @{ Title = "Team Room God"; TemplateId = 24 }
}

$subjectsByMeeting = @{
  "MPR Armazém_Controle" = @(
    "TO", "Absenteísmo", "Banco de Horas >= 40 hrs (Próprio)", "RV Equipe de Armazém",
    "% Atingimento de Metas Área", "Aderência ao GSDP", "CDP Falta de Produto", "OTIF", "TMA e EFA",
    "WLP e FLP", "OBZ - Árvores de Efeitos", "% Eficiência de Carregamento",
    "Aderência ao WMS - Todos os Módulos", "IV Crítico", "Trocas e Reposição", "Toolkit",
    "Dif. Estoque PA e AG", "HL Perdido / HL Vendido", "Quebras", "Refugo",
    "FEFO + Erro Programação + FGLI", "WMS - Módulo Contagem/erro/360", "OBZ Prejuízo + Impairment", "GOPs"
  )
  "RPS Armazém_Controle" = @(
    "TO", "Absenteismo", "CDP Falta de Produto", "OTIF", "Reposição e Erros de Montagem", "Refugo",
    "Eficiência de Carregamento", "Pallet / Ajudante e Pontuação WMS - Tratar RV",
    "Eficiência e Produtividade de Descarga", "TMA e EFA", "KPI Local"
  )
  "Team Room Distribuição" = @(
    "Relatos e Excessos", "Jornada Líquida (TML/ TR/ TI)", "Tracking / Apontamentos Zerados",
    "Devolução PDV", "Rating", "IV Crítico"
  )
  "Team Room God" = @(
    "TRI", "RELATOS", "TELEMETRIA (FROTA)", "VOLUME DE VENDAS", "OTIF", "CDP",
    "IV CRÍTICO ERRO PÓS CARREGAMENTO (EXTERNO)", "IV CRÍTICO ERRO PÓS CARREGAMENTO (INTERNO - BLITZ)",
    "QUEBRAS", "DIF. DE ESTOQUE PA/AG", "EFC", "OCUPAÇÃO DE ESTOQUE",
    "IV CRÍTICO - ADERÊNCIA A MATRIZ DE PRIORIZAÇÃO", "RONDA DE QUALIDADE", "TML", "JORNADA LÍQUIDA", "DQI",
    "IV CRÍTICO - ATRASOS", "DEVOLUÇÃO PDV", "DEVOLUÇÃO HL", "CHAMADOS", "DISPONIBILIDADE DA FROTA",
    "SOCORRO EM ROTA", "AVARIAS", "IV CRÍTICO - ADERÊNCIA AOS CHECKLISTS", "Aderência ao BEES",
    "BLITZ DE SEGURANÇA DOS CAMINHÕES", "GSA", "CHECKLIST PALETEIRA", "ESCOLINHA DE TELEMETRIA",
    "PRESTAÇÃO DE CONTA", "RETORNO DE ROTA", "LIBERAÇÃO DOS MAPAS (20:40)", "ADIANTAMENTO DA ESCALA (12:00)",
    "DISPONIBILIZAR 5 EMPILHADEIRAS", "LAVAGEM DE EMPILHADEIRAS", "MANUTENÇÃO DE PALETEIRAS", "RETRABALHO DE PALLETS",
    "ILUMINAÇÃO NO ARMAZÉM", "CONTAGEM PA (07:00)", "CONTAGEM AG (07:00)", "RECONTAGEM PA (ATÉ 2X)",
    "RECONTAGEM AG (ATÉ 2X)", "FECHAMENTO DA GRADE (10:00)", "ENTRADA DE NOTAS (07:30)", "ERRO DE CARREGAMENTO",
    "CARROS NÃO RETORNANDO DA PORTARIA", "ENVIO RECLAMAÇÕES NO PRAZO", "CAMINHÃO SIMULADO", "FIDELIZAÇÃO FROTA - ENTREGA",
    "FIDELIZAÇÃO - PUXADA", "BLITZ DE CARREGAMENTO", "ATRASOS", "MANUTENÇÃO DE CARRETAS"
  )
}

$subjectMap = @{}
foreach ($meetingTitle in $subjectsByMeeting.Keys) {
  $subjectMap[$meetingTitle] = @{}
  foreach ($subject in $subjectsByMeeting[$meetingTitle]) {
    $subjectMap[$meetingTitle][(Normalize-Value $subject)] = $subject
  }
}

$excel = $null
$book = $null
$reportBook = $null

try {
  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $book = $excel.Workbooks.Open((Resolve-Path -LiteralPath $SourcePath), $null, $true)
  $data = $book.Worksheets.Item(1).UsedRange.Value2

  $reportBook = $excel.Workbooks.Add()
  $reportSheet = $reportBook.Worksheets.Item(1)
  $reportSheet.Name = "Ações ignoradas"
  $headers = @(
    "Data", "Reunião", "Assunto", "Solicitante", "Responsável", "Plano de ação", "Início", "Fim", "Prazo", "Comentários", "Status",
    "Motivo da não importação", "Reunião cadastrada correspondente", "Assunto cadastrado correspondente"
  )

  $imported = New-Object System.Collections.Generic.List[object]
  $ignored = New-Object System.Collections.Generic.List[object]

  for ($row = 2; $row -le $data.GetLength(0); $row++) {
    $rawMeeting = ([string]$data[$row, 2]).Trim()
    $rawSubject = ([string]$data[$row, 3]).Trim()
    $meetingKey = Normalize-Value $rawMeeting
    $mappedMeeting = $null
    $mappedSubject = $null
    $reason = $null

    if (-not $meetingMap.ContainsKey($meetingKey)) {
      $reason = "Reunião não cadastrada"
    } else {
      $mappedMeeting = $meetingMap[$meetingKey]
      $subjectKey = Normalize-Value $rawSubject
      if (-not $subjectMap[$mappedMeeting.Title].ContainsKey($subjectKey)) {
        $reason = "Assunto não cadastrado para a reunião"
      } else {
        $mappedSubject = $subjectMap[$mappedMeeting.Title][$subjectKey]
      }
    }

    if ($reason) {
      $reportValues = New-Object object[] 14
      for ($column = 1; $column -le 11; $column++) {
        $reportValues[$column - 1] = [string]$data[$row, $column]
      }
      $reportValues[11] = $reason
      $reportValues[12] = if ($mappedMeeting) { $mappedMeeting.Title } else { "" }
      $reportValues[13] = if ($mappedSubject) { $mappedSubject } else { "" }
      $ignored.Add($reportValues) | Out-Null
      continue
    }

    $openedAt = Convert-ExcelDate $data[$row, 1]
    # The legacy "Fim" column has stale years. The operational date is Data,
    # and Prazo contains the duration that defines the action deadline.
    $dueDate = Convert-DeadlineFromDuration $openedAt ([string]$data[$row, 9])

    $planText = ([string]$data[$row, 6]).Trim()
    $comments = ([string]$data[$row, 10]).Trim()
    $objective = if ($comments) { "$planText`n`nComentários: $comments" } else { $planText }

    $imported.Add([ordered]@{
      sourceRow = $row
      meetingTemplateId = $mappedMeeting.TemplateId
      meetingTitle = $mappedMeeting.Title
      meetingSubject = $mappedSubject
      requesterName = ([string]$data[$row, 4]).Trim()
      ownerName = ([string]$data[$row, 5]).Trim()
      objective = $objective
      status = Convert-LegacyStatus ([string]$data[$row, 11])
      priority = "medium"
      openedAt = $openedAt
      dueDate = $dueDate
      executionDate = $openedAt
      sourceStatus = ([string]$data[$row, 11]).Trim()
    }) | Out-Null
  }

  $json = $imported | ConvertTo-Json -Depth 5
  $module = "// Generated from ACOES_IGNORADAS_RELATORIO_ATUALIZADO.xlsx. Do not edit manually.`nexport const IMPORTED_ACTION_HISTORY_ADDITIONS = $json;`n"
  [System.IO.File]::WriteAllText((Join-Path (Get-Location) $OutputPath), $module, [System.Text.UTF8Encoding]::new($false))

  $reportData = [Array]::CreateInstance([object], [int[]]@([int]($ignored.Count + 1), [int]$headers.Count))
  for ($column = 0; $column -lt $headers.Count; $column++) {
    $reportData[0, $column] = $headers[$column]
  }
  for ($row = 0; $row -lt $ignored.Count; $row++) {
    for ($column = 0; $column -lt $headers.Count; $column++) {
      $reportData[($row + 1), $column] = $ignored[$row][$column]
    }
  }
  $reportSheet.Range("A1").Resize($ignored.Count + 1, $headers.Count).Value2 = $reportData

  $headerRange = $reportSheet.Range("A1:N1")
  $headerRange.Font.Bold = $true
  $headerRange.Interior.Color = 15132390
  $reportSheet.Rows.Item(1).AutoFilter() | Out-Null
  $reportSheet.Columns.Item(1).ColumnWidth = 12
  $reportSheet.Columns.Item(2).ColumnWidth = 28
  $reportSheet.Columns.Item(3).ColumnWidth = 32
  $reportSheet.Columns.Item(4).ColumnWidth = 24
  $reportSheet.Columns.Item(5).ColumnWidth = 24
  $reportSheet.Columns.Item(6).ColumnWidth = 62
  $reportSheet.Columns.Item(7).ColumnWidth = 12
  $reportSheet.Columns.Item(8).ColumnWidth = 12
  $reportSheet.Columns.Item(9).ColumnWidth = 12
  $reportSheet.Columns.Item(10).ColumnWidth = 38
  $reportSheet.Columns.Item(11).ColumnWidth = 14
  $reportSheet.Columns.Item(12).ColumnWidth = 38
  $reportSheet.Columns.Item(13).ColumnWidth = 34
  $reportSheet.Columns.Item(14).ColumnWidth = 34
  $reportSheet.Application.ActiveWindow.SplitRow = 1
  $reportSheet.Application.ActiveWindow.FreezePanes = $true
  $reportBook.SaveAs([IO.Path]::GetFullPath($ReportPath), 51)

  Write-Output "IMPORTED_ACTIONS=$($imported.Count)"
  Write-Output "IGNORED_ACTIONS=$($ignored.Count)"
  Write-Output "REPORT_PATH=$ReportPath"
} finally {
  if ($reportBook) { $reportBook.Close($false); [Runtime.InteropServices.Marshal]::ReleaseComObject($reportBook) | Out-Null }
  if ($book) { $book.Close($false); [Runtime.InteropServices.Marshal]::ReleaseComObject($book) | Out-Null }
  if ($excel) { $excel.Quit(); [Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null }
}
