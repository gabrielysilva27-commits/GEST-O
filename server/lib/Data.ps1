function New-SeedDatabase {
    $adminPassword = Get-Sha256Hash "gaby0739"

    return @{
        meta = @{
            appName    = "LEAD Gestão"
            seededAt      = "2026-08-26T00:00:00Z"
            lastExport    = $null
            storageVersion = 2
        }
        sequence = @{
            users          = 1
            companies      = 0
            units          = 0
            tasks          = 0
            checklists     = 0
            safetyReports  = 0
            trainings      = 0
            tickets        = 0
            notifications  = 0
            history        = 0
            sessions       = 0
        }
        users = @(
            @{
                id           = 1
                name         = "Gabriely"
                username     = "Gabriely"
                role         = "admin"
                companyId    = 0
                unitIds      = @()
                status       = "active"
                passwordHash = $adminPassword
                avatar       = "GA"
                title        = "Administradora da plataforma"
                createdAt    = "2026-08-01T09:00:00Z"
            }
        )
        companies = @()
        units = @()
        tasks = @()
        checklists = @()
        safetyReports = @()
        trainings = @()
        tickets = @()
        notifications = @()
        history = @()
        sessions = @()
    }
}

function Repair-TextValue {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Value
    )

    if ($Value -match "[ÃÂâ]") {
        try {
            $bytes = [System.Text.Encoding]::GetEncoding(1252).GetBytes($Value)
            $fixed = [System.Text.Encoding]::UTF8.GetString($bytes)
            if (-not [string]::IsNullOrWhiteSpace($fixed)) {
                return $fixed
            }
        }
        catch {
            return $Value
        }
    }

    return $Value
}

function Repair-DataNode {
    param(
        [Parameter(Mandatory = $false)]
        $Node
    )

    if ($null -eq $Node) {
        return $null
    }

    if ($Node -is [string]) {
        return Repair-TextValue -Value $Node
    }

    if ($Node -is [System.Collections.IDictionary]) {
        foreach ($key in @($Node.Keys)) {
            $Node[$key] = Repair-DataNode -Node $Node[$key]
        }
        return $Node
    }

    if ($Node -is [System.Collections.IEnumerable] -and -not ($Node -is [string])) {
        $items = @()
        foreach ($item in $Node) {
            $items += ,(Repair-DataNode -Node $item)
        }
        return $items
    }

    if ($Node.PSObject -and $Node.PSObject.Properties.Count -gt 0) {
        foreach ($property in $Node.PSObject.Properties) {
            $property.Value = Repair-DataNode -Node $property.Value
        }
        return $Node
    }

    return $Node
}

function Get-DefaultUsername {
    param(
        [Parameter(Mandatory = $true)]
        $UserRecord
    )

    $preset = @{
        1 = "Gabriely"
        2 = "bruno.lima"
        3 = "carla.souza"
        4 = "diego.rocha"
        5 = "elisa.prado"
    }

    $id = [int]$UserRecord.id
    if ($preset.ContainsKey($id)) {
        return $preset[$id]
    }

    $base = ($UserRecord.name -replace "[^a-zA-Z0-9 ]", "").Trim()
    if ([string]::IsNullOrWhiteSpace($base)) {
        return "usuario$id"
    }

    return ($base -replace "\s+", ".").ToLowerInvariant()
}

function Update-DatabaseSchema {
    param(
        [Parameter(Mandatory = $true)]
        $Database
    )

    $changed = $false
    $Database = Repair-DataNode -Node $Database

    if ($null -eq $Database.meta) {
        $Database | Add-Member -NotePropertyName meta -NotePropertyValue @{
            appName = "LEAD Gestão"
            seededAt = [DateTime]::UtcNow.ToString("o")
            lastExport = $null
            storageVersion = 2
        }
        $changed = $true
    }

    if ($Database.meta.appName -ne "LEAD Gestão") {
        $Database.meta.appName = "LEAD Gestão"
        $changed = $true
    }

    foreach ($user in @($Database.users)) {
        if (-not $user.PSObject.Properties["username"]) {
            $user | Add-Member -NotePropertyName username -NotePropertyValue (Get-DefaultUsername -UserRecord $user)
            $changed = $true
        }

        if ([string]::IsNullOrWhiteSpace($user.username)) {
            $user.username = Get-DefaultUsername -UserRecord $user
            $changed = $true
        }

        if ([int]$user.id -eq 1) {
            $expectedHash = Get-Sha256Hash "gaby0739"
            if ($user.name -ne "Gabriely") { $user.name = "Gabriely"; $changed = $true }
            if ($user.username -ne "Gabriely") { $user.username = "Gabriely"; $changed = $true }
            if ($user.passwordHash -ne $expectedHash) { $user.passwordHash = $expectedHash; $changed = $true }
            if ($user.avatar -ne "GA") { $user.avatar = "GA"; $changed = $true }
            if ($user.title -ne "Administradora da plataforma") { $user.title = "Administradora da plataforma"; $changed = $true }
            if ($user.role -ne "admin") { $user.role = "admin"; $changed = $true }
            if ([int]$user.companyId -ne 0) { $user.companyId = 0; $changed = $true }
            if (@($user.unitIds).Count -ne 0) { $user.unitIds = @(); $changed = $true }
            if ($user.status -ne "active") { $user.status = "active"; $changed = $true }
        }
    }

    return $changed
}

function Initialize-DataStore {
    param(
        [Parameter(Mandatory = $true)]
        [string]$DataFile
    )

    $directory = Split-Path -Parent $DataFile
    if (-not (Test-Path -LiteralPath $directory)) {
        New-Item -ItemType Directory -Path $directory -Force | Out-Null
    }

    if (-not (Test-Path -LiteralPath $DataFile)) {
        Save-Database -DataFile $DataFile -Database (Repair-DataNode -Node (New-SeedDatabase))
    }
}

function Load-Database {
    param(
        [Parameter(Mandatory = $true)]
        [string]$DataFile
    )

    Initialize-DataStore -DataFile $DataFile
    $raw = Get-Content -LiteralPath $DataFile -Raw -Encoding UTF8
    $db = $raw | ConvertFrom-Json

    # Version 2 intentionally starts with an empty workspace and only Gabriely.
    # Any older persisted database is reset once so demo records and users cannot survive deployment.
    $storageVersion = 2
    if ($null -eq $db.meta -or [int]$db.meta.storageVersion -ne $storageVersion) {
        $db = Repair-DataNode -Node (New-SeedDatabase)
        Save-Database -DataFile $DataFile -Database $db
        return $db
    }

    foreach ($collection in @("users", "companies", "units", "tasks", "checklists", "safetyReports", "trainings", "tickets", "notifications", "history", "sessions")) {
        if ($null -eq $db.$collection) {
            $db | Add-Member -NotePropertyName $collection -NotePropertyValue @()
        }
    }

    if (Update-DatabaseSchema -Database $db) {
        Save-Database -DataFile $DataFile -Database $db
    }

    return $db
}

function Save-Database {
    param(
        [Parameter(Mandatory = $true)]
        [string]$DataFile,
        [Parameter(Mandatory = $true)]
        $Database
    )

    $json = $Database | ConvertTo-Json -Depth 100
    [System.IO.File]::WriteAllText($DataFile, $json, [System.Text.Encoding]::UTF8)
}

function Get-NextId {
    param(
        [Parameter(Mandatory = $true)]
        $Database,
        [Parameter(Mandatory = $true)]
        [string]$CollectionName
    )

    $current = [int]$Database.sequence.$CollectionName
    $next = $current + 1
    $Database.sequence.$CollectionName = $next
    return $next
}

function Get-RoleLabel {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Role
    )

    switch ($Role) {
        "admin" { return "Administrador" }
        "manager" { return "Gerente" }
        "supervisor" { return "Supervisor" }
        "operator" { return "Operador" }
        default { return $Role }
    }
}

function Get-UserProfile {
    param(
        [Parameter(Mandatory = $true)]
        $Database,
        [Parameter(Mandatory = $true)]
        $UserRecord
    )

    $company = @($Database.companies | Where-Object { $_.id -eq $UserRecord.companyId }) | Select-Object -First 1
    $units = @($Database.units | Where-Object { @($UserRecord.unitIds) -contains $_.id })

    return @{
        id          = $UserRecord.id
        name        = $UserRecord.name
        username    = $UserRecord.username
        role        = $UserRecord.role
        roleLabel   = Get-RoleLabel $UserRecord.role
        companyId   = $UserRecord.companyId
        companyName = if ($company) { $company.name } else { $null }
        unitIds     = @($UserRecord.unitIds)
        unitNames   = @($units | ForEach-Object { $_.name })
        status      = $UserRecord.status
        avatar      = $UserRecord.avatar
        title       = $UserRecord.title
        permissions = @(Get-RolePermissions $UserRecord.role)
    }
}

function Get-UserByUsername {
    param(
        [Parameter(Mandatory = $true)]
        $Database,
        [Parameter(Mandatory = $true)]
        [string]$Username
    )

    return @($Database.users | Where-Object { $_.username -ieq $Username }) | Select-Object -First 1
}

function Get-UserById {
    param(
        [Parameter(Mandatory = $true)]
        $Database,
        [Parameter(Mandatory = $true)]
        [int]$UserId
    )

    return @($Database.users | Where-Object { $_.id -eq $UserId }) | Select-Object -First 1
}

function New-Session {
    param(
        [Parameter(Mandatory = $true)]
        $Database,
        [Parameter(Mandatory = $true)]
        [int]$UserId
    )

    $token = [guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
    $session = @{
        id        = Get-NextId -Database $Database -CollectionName "sessions"
        token     = $token
        userId    = $UserId
        createdAt = [DateTime]::UtcNow.ToString("o")
        expiresAt = [DateTime]::UtcNow.AddHours(12).ToString("o")
    }

    $Database.sessions = @($Database.sessions) + $session
    return $session
}

function Remove-Session {
    param(
        [Parameter(Mandatory = $true)]
        $Database,
        [Parameter(Mandatory = $true)]
        [string]$Token
    )

    $Database.sessions = @($Database.sessions | Where-Object { $_.token -ne $Token })
}

function Get-CurrentUserFromToken {
    param(
        [Parameter(Mandatory = $true)]
        $Database,
        [Parameter(Mandatory = $false)]
        [string]$Token
    )

    if ([string]::IsNullOrWhiteSpace($Token)) {
        return $null
    }

    $session = @($Database.sessions | Where-Object { $_.token -eq $Token }) | Select-Object -First 1
    if (-not $session) {
        return $null
    }

    if ([DateTime]::Parse($session.expiresAt) -lt [DateTime]::UtcNow) {
        Remove-Session -Database $Database -Token $Token
        return $null
    }

    $user = Get-UserById -Database $Database -UserId $session.userId
    if (-not $user) {
        return $null
    }

    return Get-UserProfile -Database $Database -UserRecord $user
}

function ConvertTo-IntArray {
    param(
        [Parameter(Mandatory = $false)]
        $Value
    )

    if ($null -eq $Value) {
        return @()
    }

    $items = @()
    foreach ($item in @($Value)) {
        if ($null -ne $item -and $item.ToString().Trim().Length -gt 0) {
            $items += [int]$item
        }
    }

    return $items
}

function Test-CollectionScope {
    param(
        [Parameter(Mandatory = $true)]
        [string]$CollectionName,
        [Parameter(Mandatory = $true)]
        $Record,
        [Parameter(Mandatory = $true)]
        $User
    )

    if ($CollectionName -eq "notifications") {
        return [int]$Record.userId -eq [int]$User.id
    }

    if ($User.role -eq "admin") {
        return $true
    }

    switch ($CollectionName) {
        "users" {
            if ($User.role -eq "manager") {
                return [int]$Record.companyId -eq [int]$User.companyId
            }
            if ($User.role -eq "supervisor") {
                return [int]$Record.companyId -eq [int]$User.companyId -and (@($Record.unitIds) | Where-Object { @($User.unitIds) -contains [int]$_ }).Count -gt 0
            }
            return [int]$Record.id -eq [int]$User.id
        }
        "companies" {
            return [int]$Record.id -eq [int]$User.companyId
        }
        "units" {
            if ($User.role -eq "manager") {
                return [int]$Record.companyId -eq [int]$User.companyId
            }
            return @($User.unitIds) -contains [int]$Record.id
        }
        "tasks" {
            if ($User.role -eq "manager") {
                return [int]$Record.companyId -eq [int]$User.companyId
            }
            if ($User.role -eq "supervisor") {
                return @($User.unitIds) -contains [int]$Record.unitId
            }
            return ([int]$Record.assigneeId -eq [int]$User.id) -or ([int]$Record.createdBy -eq [int]$User.id)
        }
        "checklists" {
            if ($User.role -eq "manager") {
                return [int]$Record.companyId -eq [int]$User.companyId
            }
            return (@($Record.unitIds) | Where-Object { @($User.unitIds) -contains [int]$_ }).Count -gt 0
        }
        "safetyReports" {
            if ($User.role -eq "manager") {
                return [int]$Record.companyId -eq [int]$User.companyId
            }
            if ($User.role -eq "supervisor") {
                return @($User.unitIds) -contains [int]$Record.unitId
            }
            return ([int]$Record.reportedBy -eq [int]$User.id) -or (@($User.unitIds) -contains [int]$Record.unitId)
        }
        "trainings" {
            if ($User.role -eq "manager") {
                return [int]$Record.companyId -eq [int]$User.companyId
            }
            if ($User.role -eq "supervisor") {
                return @($User.unitIds) -contains [int]$Record.unitId
            }

            foreach ($participant in @($Record.participants)) {
                if ([int]$participant.userId -eq [int]$User.id) {
                    return $true
                }
            }

            return $false
        }
        "tickets" {
            if ($User.role -eq "manager") {
                return [int]$Record.companyId -eq [int]$User.companyId
            }
            if ($User.role -eq "supervisor") {
                return @($User.unitIds) -contains [int]$Record.unitId
            }
            return ([int]$Record.requesterId -eq [int]$User.id) -or ([int]$Record.ownerId -eq [int]$User.id)
        }
        "history" {
            if ($User.role -eq "manager") {
                return [int]$Record.companyId -eq [int]$User.companyId
            }
            if ($User.role -eq "supervisor") {
                return @($User.unitIds) -contains [int]$Record.unitId
            }
            return [int]$Record.actorId -eq [int]$User.id
        }
        default {
            return $true
        }
    }
}

function Get-ScopedCollection {
    param(
        [Parameter(Mandatory = $true)]
        $Database,
        [Parameter(Mandatory = $true)]
        $User,
        [Parameter(Mandatory = $true)]
        [string]$CollectionName
    )

    $items = @($Database.$CollectionName | Where-Object { $null -ne $_ })
    return @($items | Where-Object { Test-CollectionScope -CollectionName $CollectionName -Record $_ -User $User })
}

function Add-HistoryEntry {
    param(
        [Parameter(Mandatory = $true)]
        $Database,
        [Parameter(Mandatory = $true)]
        [string]$Module,
        [Parameter(Mandatory = $true)]
        [string]$Action,
        [Parameter(Mandatory = $true)]
        [int]$EntityId,
        [Parameter(Mandatory = $true)]
        [int]$ActorId,
        [Parameter(Mandatory = $true)]
        [int]$CompanyId,
        [Parameter(Mandatory = $true)]
        [int]$UnitId,
        [Parameter(Mandatory = $true)]
        [string]$Description
    )

    $entry = @{
        id          = Get-NextId -Database $Database -CollectionName "history"
        module      = $Module
        action      = $Action
        entityId    = $EntityId
        actorId     = $ActorId
        companyId   = $CompanyId
        unitId      = $UnitId
        description = $Description
        createdAt   = [DateTime]::UtcNow.ToString("o")
    }

    $Database.history = @($Database.history) + $entry
    return $entry
}

function Add-Notification {
    param(
        [Parameter(Mandatory = $true)]
        $Database,
        [Parameter(Mandatory = $true)]
        [int]$UserId,
        [Parameter(Mandatory = $true)]
        [string]$Title,
        [Parameter(Mandatory = $true)]
        [string]$Message,
        [string]$Level = "info",
        [string]$Link = "dashboard"
    )

    $notification = @{
        id        = Get-NextId -Database $Database -CollectionName "notifications"
        userId    = $UserId
        title     = $Title
        message   = $Message
        level     = $Level
        link      = $Link
        read      = $false
        createdAt = [DateTime]::UtcNow.ToString("o")
    }

    $Database.notifications = @($Database.notifications) + $notification
    return $notification
}

function Get-DashboardData {
    param(
        [Parameter(Mandatory = $true)]
        $Database,
        [Parameter(Mandatory = $true)]
        $User
    )

    $tasks = Get-ScopedCollection -Database $Database -User $User -CollectionName "tasks"
    $tickets = Get-ScopedCollection -Database $Database -User $User -CollectionName "tickets"
    $trainings = Get-ScopedCollection -Database $Database -User $User -CollectionName "trainings"
    $safety = Get-ScopedCollection -Database $Database -User $User -CollectionName "safetyReports"
    $checklists = Get-ScopedCollection -Database $Database -User $User -CollectionName "checklists"
    $notifications = Get-ScopedCollection -Database $Database -User $User -CollectionName "notifications"

    $today = [DateTime]::Parse("2026-08-25")
    $overdueTasks = @($tasks | Where-Object {
        $_.status -ne "done" -and
        -not [string]::IsNullOrWhiteSpace($_.dueDate) -and
        [DateTime]::Parse($_.dueDate) -lt $today
    })

    $pendingTrainingCount = 0
    foreach ($training in @($trainings)) {
        foreach ($participant in @($training.participants)) {
            if ([int]$participant.userId -eq [int]$User.id -and $participant.status -ne "completed") {
                $pendingTrainingCount++
            }
        }

        if ($User.role -in @("admin", "manager", "supervisor") -and $training.status -ne "completed") {
            $pendingTrainingCount++
        }
    }

    $tasksByStatus = @(
        @{ label = "Abertas"; value = (@($tasks | Where-Object { $_.status -eq "open" })).Count },
        @{ label = "Em andamento"; value = (@($tasks | Where-Object { $_.status -eq "in_progress" })).Count },
        @{ label = "Concluídas"; value = (@($tasks | Where-Object { $_.status -eq "done" })).Count }
    )

    $safetyBySeverity = @(
        @{ label = "Crítico/alto"; value = (@($safety | Where-Object { $_.severity -in @("critical", "high") })).Count },
        @{ label = "Médio"; value = (@($safety | Where-Object { $_.severity -eq "medium" })).Count },
        @{ label = "Baixo"; value = (@($safety | Where-Object { $_.severity -eq "low" })).Count }
    )

    $trainingCompletion = @()
    foreach ($training in @($trainings)) {
        $participants = @($training.participants)
        $completed = @($participants | Where-Object { $_.status -eq "completed" }).Count
        $total = [Math]::Max($participants.Count, 1)
        $trainingCompletion += @{
            label = $training.title
            value = [Math]::Round(($completed / $total) * 100, 0)
        }
    }

    return @{
        kpis = @(
            @{ label = "Tarefas ativas"; value = (@($tasks | Where-Object { $_.status -ne "done" })).Count; helper = "Fluxo operacional em execução" },
            @{ label = "Tarefas vencidas"; value = $overdueTasks.Count; helper = "Prioridade imediata" },
            @{ label = "Chamados abertos"; value = (@($tickets | Where-Object { $_.status -ne "resolved" -and $_.status -ne "closed" })).Count; helper = "Demandas de suporte" },
            @{ label = "Treinamentos pendentes"; value = $pendingTrainingCount; helper = "Planos ainda não concluídos" },
            @{ label = "Não conformidades"; value = (@($safety | Where-Object { $_.status -ne "resolved" })).Count; helper = "Ocorrências de segurança" },
            @{ label = "Checklists ativos"; value = $checklists.Count; helper = "Rotinas monitoradas" }
        )
        charts = @{
            tasksByStatus      = $tasksByStatus
            safetyBySeverity   = $safetyBySeverity
            trainingCompletion = $trainingCompletion
        }
        highlights = @{
            overdueTasks      = @($overdueTasks | Select-Object -First 5)
            urgentSafetyItems = @($safety | Where-Object { $_.severity -in @("critical", "high") -and $_.status -ne "resolved" } | Select-Object -First 5)
            unreadNotifications = (@($notifications | Where-Object { -not $_.read })).Count
        }
        feed = @(
            @(Get-ScopedCollection -Database $Database -User $User -CollectionName "history" | Sort-Object createdAt -Descending | Select-Object -First 6)
        )
    }
}

function Get-ReportsSummary {
    param(
        [Parameter(Mandatory = $true)]
        $Database,
        [Parameter(Mandatory = $true)]
        $User
    )

    $tasks = Get-ScopedCollection -Database $Database -User $User -CollectionName "tasks"
    $safety = Get-ScopedCollection -Database $Database -User $User -CollectionName "safetyReports"
    $trainings = Get-ScopedCollection -Database $Database -User $User -CollectionName "trainings"
    $tickets = Get-ScopedCollection -Database $Database -User $User -CollectionName "tickets"

    $checklists = Get-ScopedCollection -Database $Database -User $User -CollectionName "checklists"
    $checklistAverage = 0
    if ($checklists.Count -gt 0) {
        $average = ($checklists | Measure-Object -Property complianceRate -Average).Average
        if ($null -ne $average) {
            $checklistAverage = [Math]::Round([double]$average, 0)
        }
    }

    return @{
        generatedAt = [DateTime]::UtcNow.ToString("o")
        cards = @(
            @{ label = "Conformidade de checklists"; value = $checklistAverage; unit = "%" },
            @{ label = "Treinamentos concluídos"; value = (@($trainings | Where-Object { $_.status -eq "completed" })).Count; unit = "" },
            @{ label = "Relatos resolvidos"; value = (@($safety | Where-Object { $_.status -eq "resolved" })).Count; unit = "" },
            @{ label = "Chamados em SLA"; value = (@($tickets | Where-Object { $_.status -in @("open", "in_progress") })).Count; unit = "" }
        )
        breakdown = @{
            tasks = @{
                open       = (@($tasks | Where-Object { $_.status -eq "open" })).Count
                inProgress = (@($tasks | Where-Object { $_.status -eq "in_progress" })).Count
                done       = (@($tasks | Where-Object { $_.status -eq "done" })).Count
            }
            safety = @{
                open         = (@($safety | Where-Object { $_.status -eq "open" })).Count
                investigating = (@($safety | Where-Object { $_.status -eq "investigating" })).Count
                resolved     = (@($safety | Where-Object { $_.status -eq "resolved" })).Count
            }
            trainings = @{
                scheduled   = (@($trainings | Where-Object { $_.status -eq "scheduled" })).Count
                inProgress  = (@($trainings | Where-Object { $_.status -eq "in_progress" })).Count
                completed   = (@($trainings | Where-Object { $_.status -eq "completed" })).Count
            }
        }
    }
}

function Convert-CollectionToCsv {
    param(
        [Parameter(Mandatory = $true)]
        $Items
    )

    $rows = @($Items | ConvertTo-Csv -NoTypeInformation)
    return ($rows -join [Environment]::NewLine)
}
