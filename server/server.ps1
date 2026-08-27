param(
    [int]$Port = 8080,
    [string]$DataFile = $(Join-Path $PSScriptRoot "data\database.json")
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "lib\Auth.ps1")
. (Join-Path $PSScriptRoot "lib\Responses.ps1")
. (Join-Path $PSScriptRoot "lib\Data.ps1")

$publicRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\public"))

function Get-JsonBody {
    param(
        [Parameter(Mandatory = $true)]
        $Context
    )

    $body = Get-RequestBody -Request $Context.Request
    if ([string]::IsNullOrWhiteSpace($body)) {
        return $null
    }

    try {
        return $body | ConvertFrom-Json
    }
    catch {
        Send-ErrorResponse -Context $Context -StatusCode 400 -Message "O corpo da requisição precisa estar em JSON válido." -Code "invalid_json"
        return $false
    }
}

function Get-AuthContext {
    param(
        [Parameter(Mandatory = $true)]
        $Context,
        [Parameter(Mandatory = $true)]
        $Database
    )

    $token = Get-BearerToken -Request $Context.Request
    $user = Get-CurrentUserFromToken -Database $Database -Token $token
    if (-not $user) {
        Send-ErrorResponse -Context $Context -StatusCode 401 -Message "Sessão inválida ou expirada. Faça login novamente." -Code "unauthorized"
        return $null
    }

    return @{
        token = $token
        user  = $user
    }
}

function Ensure-PermissionOrRespond {
    param(
        [Parameter(Mandatory = $true)]
        $Context,
        [Parameter(Mandatory = $true)]
        $User,
        [Parameter(Mandatory = $true)]
        [string]$Permission
    )

    if (-not (Test-Permission -User $User -Permission $Permission)) {
        Send-ErrorResponse -Context $Context -StatusCode 403 -Message "Seu perfil não tem permissão para esta ação." -Code "forbidden"
        return $false
    }

    return $true
}

function Get-LookupsPayload {
    param(
        [Parameter(Mandatory = $true)]
        $Database,
        [Parameter(Mandatory = $true)]
        $User
    )

    $users = @(
        Get-ScopedCollection -Database $Database -User $User -CollectionName "users" |
        ForEach-Object {
            @{
                id        = $_.id
                name      = $_.name
                username  = $_.username
                role      = $_.role
                roleLabel = Get-RoleLabel $_.role
                companyId = $_.companyId
                unitIds   = @($_.unitIds)
            }
        }
    )

    return @{
        users = $users
        companies = @(
            Get-ScopedCollection -Database $Database -User $User -CollectionName "companies" |
            ForEach-Object {
                @{
                    id           = $_.id
                    name         = $_.name
                    segment      = $_.segment
                    headquarters = $_.headquarters
                }
            }
        )
        units = @(
            Get-ScopedCollection -Database $Database -User $User -CollectionName "units" |
            ForEach-Object {
                @{
                    id        = $_.id
                    name      = $_.name
                    companyId = $_.companyId
                    city      = $_.city
                    state     = $_.state
                }
            }
        )
        roles = @(
            @{ id = "admin"; label = "Administrador" },
            @{ id = "manager"; label = "Gerente" },
            @{ id = "supervisor"; label = "Supervisor" },
            @{ id = "operator"; label = "Operador" }
        )
        navigation = @(
            @{ id = "dashboard"; label = "Dashboard"; permission = "dashboard.view" },
            @{ id = "users"; label = "Usuários"; permission = "users.read" },
            @{ id = "tasks"; label = "Tarefas"; permission = "tasks.read" },
            @{ id = "checklists"; label = "Checklists"; permission = "checklists.read" },
            @{ id = "safety"; label = "Relatos de segurança"; permission = "safety.read" },
            @{ id = "trainings"; label = "Treinamentos"; permission = "trainings.read" },
            @{ id = "tickets"; label = "Chamados"; permission = "tickets.read" },
            @{ id = "reports"; label = "Relatórios"; permission = "reports.view" },
            @{ id = "notifications"; label = "Notificações"; permission = "notifications.view" },
            @{ id = "history"; label = "Histórico"; permission = "history.view" }
        )
    }
}

function Get-LocalNetworkAddresses {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port
    )

    $addresses = New-Object System.Collections.Generic.HashSet[string]([System.StringComparer]::OrdinalIgnoreCase)

    try {
        $ipAddresses = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
            Where-Object {
                $_.IPAddress -ne "127.0.0.1" -and
                $_.IPAddress -notlike "169.254*"
            } |
            Select-Object -ExpandProperty IPAddress -Unique

        foreach ($address in @($ipAddresses)) {
            $null = $addresses.Add($address)
        }
    }
    catch {
        try {
            $hostAddresses = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) |
                Where-Object {
                    $_.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and
                    $_.IPAddressToString -ne "127.0.0.1"
                } |
                ForEach-Object { $_.IPAddressToString } |
                Select-Object -Unique

            foreach ($address in @($hostAddresses)) {
                $null = $addresses.Add($address)
            }
        }
        catch {
        }
    }

    return @($addresses)
}

function Ensure-FirewallAccess {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port
    )

    try {
        if (-not (Get-Command Get-NetFirewallRule -ErrorAction SilentlyContinue)) {
            return
        }

        $ruleName = "LEAD Gestao Porta $Port"
        $existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
        if (-not $existing) {
            New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Port -Profile Private | Out-Null
        }
    }
    catch {
        Write-Warning ("Nao foi possivel criar a regra de firewall automaticamente. " + $_.Exception.Message)
    }
}

if (-not ("LeadTcpProxy" -as [type])) {
    Add-Type -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Sockets;
using System.Threading;
using System.Threading.Tasks;

public sealed class LeadTcpProxy : IDisposable
{
    private readonly List<TcpListener> listeners = new List<TcpListener>();
    private readonly List<Task> acceptTasks = new List<Task>();
    private readonly CancellationTokenSource cancellation = new CancellationTokenSource();
    private readonly string targetHost;
    private readonly int targetPort;

    public LeadTcpProxy(IEnumerable<string> addresses, int listenPort, string targetHost, int targetPort)
    {
        this.targetHost = targetHost;
        this.targetPort = targetPort;

        foreach (var address in addresses)
        {
            IPAddress ip;
            if (IPAddress.TryParse(address, out ip))
            {
                listeners.Add(new TcpListener(ip, listenPort));
            }
        }
    }

    public void Start()
    {
        foreach (var listener in listeners)
        {
            listener.Start();
            acceptTasks.Add(Task.Run(() => AcceptLoop(listener)));
        }
    }

    private async Task AcceptLoop(TcpListener listener)
    {
        while (!cancellation.IsCancellationRequested)
        {
            TcpClient inbound = null;
            try
            {
                inbound = await listener.AcceptTcpClientAsync().ConfigureAwait(false);
                var ignored = Task.Run(() => HandleClient(inbound));
            }
            catch
            {
                if (inbound != null)
                {
                    inbound.Dispose();
                }
                if (cancellation.IsCancellationRequested)
                {
                    return;
                }
            }
        }
    }

    private async Task HandleClient(TcpClient inbound)
    {
        using (inbound)
        using (var outbound = new TcpClient())
        {
            try
            {
                await outbound.ConnectAsync(targetHost, targetPort).ConfigureAwait(false);
                using (var inboundStream = inbound.GetStream())
                using (var outboundStream = outbound.GetStream())
                {
                    var forward = inboundStream.CopyToAsync(outboundStream);
                    var backward = outboundStream.CopyToAsync(inboundStream);
                    await Task.WhenAny(forward, backward).ConfigureAwait(false);
                }
            }
            catch
            {
            }
        }
    }

    public void Dispose()
    {
        cancellation.Cancel();
        foreach (var listener in listeners)
        {
            try { listener.Stop(); } catch { }
        }
        try { Task.WaitAll(acceptTasks.ToArray(), TimeSpan.FromSeconds(1)); } catch { }
        cancellation.Dispose();
    }
}
"@
}

function Resolve-Unit {
    param(
        [Parameter(Mandatory = $true)]
        $Database,
        [Parameter(Mandatory = $true)]
        [int]$UnitId
    )

    return @($Database.units | Where-Object { $_.id -eq $UnitId }) | Select-Object -First 1
}

function Resolve-CompanyIdForRecord {
    param(
        [Parameter(Mandatory = $true)]
        $Database,
        [Parameter(Mandatory = $true)]
        $User,
        [Parameter(Mandatory = $false)]
        [int]$CompanyId,
        [Parameter(Mandatory = $false)]
        [int]$UnitId = 0
    )

    if ($User.role -ne "admin") {
        return [int]$User.companyId
    }

    if ($UnitId -gt 0) {
        $unit = Resolve-Unit -Database $Database -UnitId $UnitId
        if ($unit) {
            return [int]$unit.companyId
        }
    }

    return [int]$CompanyId
}

function Send-Bootstrap {
    param(
        [Parameter(Mandatory = $true)]
        $Context,
        [Parameter(Mandatory = $true)]
        $Database,
        [Parameter(Mandatory = $true)]
        $User
    )

    Send-JsonResponse -Context $Context -StatusCode 200 -Data @{
        user    = $User
        lookups = Get-LookupsPayload -Database $Database -User $User
    }
}

function Get-StaticContentType {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
        ".html" { return "text/html; charset=utf-8" }
        ".css" { return "text/css; charset=utf-8" }
        ".js" { return "application/javascript; charset=utf-8" }
        ".json" { return "application/json; charset=utf-8" }
        ".svg" { return "image/svg+xml" }
        ".png" { return "image/png" }
        default { return "application/octet-stream" }
    }
}

function Serve-StaticFile {
    param(
        [Parameter(Mandatory = $true)]
        $Context,
        [Parameter(Mandatory = $true)]
        [string]$PublicRoot
    )

    $path = $Context.Request.Url.AbsolutePath
    if ($path -eq "/") {
        $path = "/index.html"
    }

    $relative = $path.TrimStart("/").Replace("/", [System.IO.Path]::DirectorySeparatorChar)
    $filePath = [System.IO.Path]::GetFullPath((Join-Path $PublicRoot $relative))

    if (-not $filePath.StartsWith($PublicRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        Send-ErrorResponse -Context $Context -StatusCode 403 -Message "Acesso ao arquivo negado." -Code "path_forbidden"
        return
    }

    if (-not (Test-Path -LiteralPath $filePath)) {
        $filePath = Join-Path $PublicRoot "index.html"
    }

    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    $contentType = Get-StaticContentType -Path $filePath
    Send-BytesResponse -Context $Context -StatusCode 200 -Bytes $bytes -ContentType $contentType
}

function Get-EntityArray {
    param(
        [Parameter(Mandatory = $true)]
        $Database,
        [Parameter(Mandatory = $true)]
        [string]$CollectionName
    )

    return @($Database.$CollectionName)
}

function Add-EntityRecord {
    param(
        [Parameter(Mandatory = $true)]
        $Database,
        [Parameter(Mandatory = $true)]
        [string]$CollectionName,
        [Parameter(Mandatory = $true)]
        $Record
    )

    $Database.$CollectionName = @($Database.$CollectionName) + $Record
}

Initialize-DataStore -DataFile $DataFile

$listener = New-Object System.Net.HttpListener
 $listener.Prefixes.Add("http://localhost:$Port/")
$networkAddresses = @(Get-LocalNetworkAddresses -Port $Port)
$networkPort = $Port + 1
$proxy = $null
Ensure-FirewallAccess -Port $Port
$listener.Start()

if ($networkAddresses.Count -gt 0) {
    try {
        $proxy = [LeadTcpProxy]::new([string[]]$networkAddresses, $networkPort, "127.0.0.1", $Port)
        $proxy.Start()
    }
    catch {
        Write-Warning ("Nao foi possivel iniciar o proxy de rede local. " + $_.Exception.Message)
    }
}

Write-Host "LEAD Gestão disponível em:"
Write-Host " - http://localhost:$Port/"
foreach ($address in $networkAddresses) {
    Write-Host " - http://${address}:$networkPort/"
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $path = $request.Url.AbsolutePath.TrimEnd("/")
        if ([string]::IsNullOrWhiteSpace($path)) {
            $path = "/"
        }

        try {
            if ($request.HttpMethod -eq "OPTIONS") {
                Send-OptionsResponse -Context $context
                continue
            }

            if (-not $path.StartsWith("/api")) {
                Serve-StaticFile -Context $context -PublicRoot $publicRoot
                continue
            }

            $db = Load-Database -DataFile $DataFile

            if ($path -eq "/api/health" -and $request.HttpMethod -eq "GET") {
                Send-JsonResponse -Context $context -StatusCode 200 -Data @{
                    status    = "ok"
                    app       = "LEAD Gestão"
                    timestamp = [DateTime]::UtcNow.ToString("o")
                }
                continue
            }

            if ($path -eq "/api/auth/login" -and $request.HttpMethod -eq "POST") {
                $payload = Get-JsonBody -Context $context
                if ($payload -eq $false) { continue }

                if (-not $payload -or [string]::IsNullOrWhiteSpace($payload.username) -or [string]::IsNullOrWhiteSpace($payload.password)) {
                    Send-ErrorResponse -Context $context -StatusCode 400 -Message "Informe usuário e senha para continuar." -Code "validation_error"
                    continue
                }

                $userRecord = Get-UserByUsername -Database $db -Username $payload.username
                if (-not $userRecord) {
                    Send-ErrorResponse -Context $context -StatusCode 401 -Message "Credenciais inválidas." -Code "invalid_credentials"
                    continue
                }

                $hash = Get-Sha256Hash $payload.password
                if ($userRecord.passwordHash -ne $hash) {
                    Send-ErrorResponse -Context $context -StatusCode 401 -Message "Credenciais inválidas." -Code "invalid_credentials"
                    continue
                }

                $session = New-Session -Database $db -UserId $userRecord.id
                Save-Database -DataFile $DataFile -Database $db
                $profile = Get-UserProfile -Database $db -UserRecord $userRecord

                Send-JsonResponse -Context $context -StatusCode 200 -Data @{
                    token   = $session.token
                    user    = $profile
                    lookups = Get-LookupsPayload -Database $db -User $profile
                }
                continue
            }

            if ($path -eq "/api/auth/me" -and $request.HttpMethod -eq "GET") {
                $auth = Get-AuthContext -Context $context -Database $db
                if (-not $auth) { continue }
                Send-Bootstrap -Context $context -Database $db -User $auth.user
                continue
            }

            if ($path -eq "/api/auth/logout" -and $request.HttpMethod -eq "POST") {
                $auth = Get-AuthContext -Context $context -Database $db
                if (-not $auth) { continue }
                Remove-Session -Database $db -Token $auth.token
                Save-Database -DataFile $DataFile -Database $db
                Send-JsonResponse -Context $context -StatusCode 200 -Data @{ success = $true }
                continue
            }

            $auth = Get-AuthContext -Context $context -Database $db
            if (-not $auth) { continue }
            $user = $auth.user

            if ($path -eq "/api/bootstrap" -and $request.HttpMethod -eq "GET") {
                Send-Bootstrap -Context $context -Database $db -User $user
                continue
            }

            if ($path -eq "/api/dashboard" -and $request.HttpMethod -eq "GET") {
                if (-not (Ensure-PermissionOrRespond -Context $context -User $user -Permission "dashboard.view")) { continue }
                Send-JsonResponse -Context $context -StatusCode 200 -Data (Get-DashboardData -Database $db -User $user)
                continue
            }

            if ($path -eq "/api/users" -and $request.HttpMethod -eq "GET") {
                if (-not (Ensure-PermissionOrRespond -Context $context -User $user -Permission "users.read")) { continue }
                $items = @(
                    Get-ScopedCollection -Database $db -User $user -CollectionName "users" |
                    ForEach-Object { Get-UserProfile -Database $db -UserRecord $_ }
                )
                Send-JsonResponse -Context $context -StatusCode 200 -Data @{ items = $items }
                continue
            }

            if ($path -eq "/api/users" -and $request.HttpMethod -eq "POST") {
                if (-not (Ensure-PermissionOrRespond -Context $context -User $user -Permission "users.manage")) { continue }
                $payload = Get-JsonBody -Context $context
                if ($payload -eq $false) { continue }

                if ([string]::IsNullOrWhiteSpace($payload.name) -or [string]::IsNullOrWhiteSpace($payload.username) -or [string]::IsNullOrWhiteSpace($payload.role)) {
                    Send-ErrorResponse -Context $context -StatusCode 400 -Message "Nome, usuário e perfil são obrigatórios." -Code "validation_error"
                    continue
                }

                if (Get-UserByUsername -Database $db -Username $payload.username) {
                    Send-ErrorResponse -Context $context -StatusCode 409 -Message "Já existe um usuário com este nome de usuário." -Code "conflict"
                    continue
                }

                $unitIds = ConvertTo-IntArray $payload.unitIds
                if ($unitIds.Count -eq 0 -and $payload.unitId) {
                    $unitIds = @([int]$payload.unitId)
                }

                $companyId = if ($user.role -eq "admin" -and $payload.companyId) { [int]$payload.companyId } else { [int]$user.companyId }

                $record = @{
                    id           = Get-NextId -Database $db -CollectionName "users"
                    name         = $payload.name.Trim()
                    username     = $payload.username.Trim()
                    role         = $payload.role
                    companyId    = $companyId
                    unitIds      = $unitIds
                    status       = "active"
                    passwordHash = Get-Sha256Hash $(if ([string]::IsNullOrWhiteSpace($payload.password)) { "Senha@123" } else { $payload.password })
                    avatar       = (($payload.name -split "\s+" | Select-Object -First 2 | ForEach-Object { $_.Substring(0, 1).ToUpperInvariant() }) -join "")
                    title        = "Usuário da plataforma"
                    createdAt    = [DateTime]::UtcNow.ToString("o")
                }

                if (-not (Test-CollectionScope -CollectionName "users" -Record $record -User $user)) {
                    Send-ErrorResponse -Context $context -StatusCode 403 -Message "Não é permitido cadastrar usuário fora da sua abrangência." -Code "scope_forbidden"
                    continue
                }

                Add-EntityRecord -Database $db -CollectionName "users" -Record $record
                Add-HistoryEntry -Database $db -Module "users" -Action "created" -EntityId $record.id -ActorId $user.id -CompanyId $record.companyId -UnitId $(if ($record.unitIds.Count -gt 0) { [int]$record.unitIds[0] } else { 0 }) -Description "Usuário $($record.name) criado com perfil $(Get-RoleLabel $record.role)."
                Save-Database -DataFile $DataFile -Database $db
                Send-JsonResponse -Context $context -StatusCode 201 -Data @{ item = Get-UserProfile -Database $db -UserRecord $record }
                continue
            }

            if ($path -eq "/api/companies" -and $request.HttpMethod -eq "GET") {
                if (-not (Ensure-PermissionOrRespond -Context $context -User $user -Permission "companies.read")) { continue }
                Send-JsonResponse -Context $context -StatusCode 200 -Data @{
                    companies = @(Get-ScopedCollection -Database $db -User $user -CollectionName "companies")
                    units     = @(Get-ScopedCollection -Database $db -User $user -CollectionName "units")
                }
                continue
            }

            if ($path -eq "/api/companies" -and $request.HttpMethod -eq "POST") {
                if (-not (Ensure-PermissionOrRespond -Context $context -User $user -Permission "companies.manage")) { continue }
                $payload = Get-JsonBody -Context $context
                if ($payload -eq $false) { continue }

                if ([string]::IsNullOrWhiteSpace($payload.name) -or [string]::IsNullOrWhiteSpace($payload.segment) -or [string]::IsNullOrWhiteSpace($payload.headquarters)) {
                    Send-ErrorResponse -Context $context -StatusCode 400 -Message "Nome, segmento e sede são obrigatórios." -Code "validation_error"
                    continue
                }

                $record = @{
                    id           = Get-NextId -Database $db -CollectionName "companies"
                    name         = $payload.name.Trim()
                    segment      = $payload.segment.Trim()
                    headquarters = $payload.headquarters.Trim()
                    status       = "active"
                    createdAt    = [DateTime]::UtcNow.ToString("o")
                }

                Add-EntityRecord -Database $db -CollectionName "companies" -Record $record
                Add-HistoryEntry -Database $db -Module "companies" -Action "created" -EntityId $record.id -ActorId $user.id -CompanyId $record.id -UnitId 0 -Description "Empresa $($record.name) cadastrada."
                Save-Database -DataFile $DataFile -Database $db
                Send-JsonResponse -Context $context -StatusCode 201 -Data @{ item = $record }
                continue
            }

            if ($path -eq "/api/units" -and $request.HttpMethod -eq "GET") {
                if (-not (Ensure-PermissionOrRespond -Context $context -User $user -Permission "units.read")) { continue }
                Send-JsonResponse -Context $context -StatusCode 200 -Data @{ items = @(Get-ScopedCollection -Database $db -User $user -CollectionName "units") }
                continue
            }

            if ($path -eq "/api/units" -and $request.HttpMethod -eq "POST") {
                if (-not (Ensure-PermissionOrRespond -Context $context -User $user -Permission "units.manage")) { continue }
                $payload = Get-JsonBody -Context $context
                if ($payload -eq $false) { continue }

                if ([string]::IsNullOrWhiteSpace($payload.name) -or [string]::IsNullOrWhiteSpace($payload.city) -or [string]::IsNullOrWhiteSpace($payload.state)) {
                    Send-ErrorResponse -Context $context -StatusCode 400 -Message "Nome, cidade e estado são obrigatórios." -Code "validation_error"
                    continue
                }

                $companyId = Resolve-CompanyIdForRecord -Database $db -User $user -CompanyId $(if ($payload.companyId) { [int]$payload.companyId } else { [int]$user.companyId })
                $record = @{
                    id        = Get-NextId -Database $db -CollectionName "units"
                    companyId = $companyId
                    name      = $payload.name.Trim()
                    city      = $payload.city.Trim()
                    state     = $payload.state.Trim()
                    status    = "active"
                    managerId = $(if ($payload.managerId) { [int]$payload.managerId } else { $user.id })
                    createdAt = [DateTime]::UtcNow.ToString("o")
                }

                if (-not (Test-CollectionScope -CollectionName "units" -Record $record -User $user)) {
                    Send-ErrorResponse -Context $context -StatusCode 403 -Message "Não é permitido cadastrar unidade fora da sua abrangência." -Code "scope_forbidden"
                    continue
                }

                Add-EntityRecord -Database $db -CollectionName "units" -Record $record
                Add-HistoryEntry -Database $db -Module "companies" -Action "created" -EntityId $record.id -ActorId $user.id -CompanyId $record.companyId -UnitId $record.id -Description "Unidade $($record.name) cadastrada."
                Save-Database -DataFile $DataFile -Database $db
                Send-JsonResponse -Context $context -StatusCode 201 -Data @{ item = $record }
                continue
            }

            if ($path -eq "/api/tasks" -and $request.HttpMethod -eq "GET") {
                if (-not (Ensure-PermissionOrRespond -Context $context -User $user -Permission "tasks.read")) { continue }
                Send-JsonResponse -Context $context -StatusCode 200 -Data @{ items = @(Get-ScopedCollection -Database $db -User $user -CollectionName "tasks" | Sort-Object dueDate) }
                continue
            }

            if ($path -eq "/api/tasks" -and $request.HttpMethod -eq "POST") {
                if (-not (Ensure-PermissionOrRespond -Context $context -User $user -Permission "tasks.manage")) { continue }
                $payload = Get-JsonBody -Context $context
                if ($payload -eq $false) { continue }

                if ([string]::IsNullOrWhiteSpace($payload.title) -or -not $payload.unitId -or -not $payload.assigneeId -or [string]::IsNullOrWhiteSpace($payload.dueDate)) {
                    Send-ErrorResponse -Context $context -StatusCode 400 -Message "Título, unidade, responsável e vencimento são obrigatórios." -Code "validation_error"
                    continue
                }

                $unit = Resolve-Unit -Database $db -UnitId ([int]$payload.unitId)
                if (-not $unit) {
                    Send-ErrorResponse -Context $context -StatusCode 404 -Message "Unidade informada não existe." -Code "not_found"
                    continue
                }

                $record = @{
                    id          = Get-NextId -Database $db -CollectionName "tasks"
                    title       = $payload.title.Trim()
                    description = $(if ($payload.description) { $payload.description.Trim() } else { "" })
                    status      = $(if ($payload.status) { $payload.status } else { "open" })
                    priority    = $(if ($payload.priority) { $payload.priority } else { "medium" })
                    dueDate     = $payload.dueDate
                    companyId   = Resolve-CompanyIdForRecord -Database $db -User $user -CompanyId $unit.companyId -UnitId $unit.id
                    unitId      = [int]$payload.unitId
                    assigneeId  = [int]$payload.assigneeId
                    createdBy   = [int]$user.id
                    tags        = @($(if ($payload.tags) { @($payload.tags) } else { @() }))
                    createdAt   = [DateTime]::UtcNow.ToString("o")
                    updatedAt   = [DateTime]::UtcNow.ToString("o")
                }

                if (-not (Test-CollectionScope -CollectionName "tasks" -Record $record -User $user)) {
                    Send-ErrorResponse -Context $context -StatusCode 403 -Message "A tarefa precisa estar dentro da sua área de atuação." -Code "scope_forbidden"
                    continue
                }

                Add-EntityRecord -Database $db -CollectionName "tasks" -Record $record
                Add-HistoryEntry -Database $db -Module "tasks" -Action "created" -EntityId $record.id -ActorId $user.id -CompanyId $record.companyId -UnitId $record.unitId -Description "Tarefa '$($record.title)' criada."
                Add-Notification -Database $db -UserId $record.assigneeId -Title "Nova tarefa atribuída" -Message $record.title -Level "info" -Link "tasks"
                Save-Database -DataFile $DataFile -Database $db
                Send-JsonResponse -Context $context -StatusCode 201 -Data @{ item = $record }
                continue
            }

            if ($path -eq "/api/checklists" -and $request.HttpMethod -eq "GET") {
                if (-not (Ensure-PermissionOrRespond -Context $context -User $user -Permission "checklists.read")) { continue }
                Send-JsonResponse -Context $context -StatusCode 200 -Data @{ items = @(Get-ScopedCollection -Database $db -User $user -CollectionName "checklists") }
                continue
            }

            if ($path -eq "/api/checklists" -and $request.HttpMethod -eq "POST") {
                if (-not (Ensure-PermissionOrRespond -Context $context -User $user -Permission "checklists.manage")) { continue }
                $payload = Get-JsonBody -Context $context
                if ($payload -eq $false) { continue }

                $unitIds = ConvertTo-IntArray $payload.unitIds
                if ([string]::IsNullOrWhiteSpace($payload.name) -or [string]::IsNullOrWhiteSpace($payload.category) -or $unitIds.Count -eq 0) {
                    Send-ErrorResponse -Context $context -StatusCode 400 -Message "Nome, categoria e ao menos uma unidade são obrigatórios." -Code "validation_error"
                    continue
                }

                $items = @()
                $itemId = 0
                foreach ($line in @($payload.items)) {
                    if ($null -ne $line -and $line.ToString().Trim().Length -gt 0) {
                        $itemId++
                        $items += @{
                            id          = $itemId
                            label       = $line.ToString().Trim()
                            required    = $true
                            description = "Item criado pela interface"
                        }
                    }
                }

                if ($items.Count -eq 0) {
                    Send-ErrorResponse -Context $context -StatusCode 400 -Message "Inclua ao menos um item no checklist." -Code "validation_error"
                    continue
                }

                $companyId = Resolve-CompanyIdForRecord -Database $db -User $user -CompanyId $(if ($payload.companyId) { [int]$payload.companyId } else { [int]$user.companyId }) -UnitId $unitIds[0]
                $record = @{
                    id             = Get-NextId -Database $db -CollectionName "checklists"
                    name           = $payload.name.Trim()
                    category       = $payload.category.Trim()
                    companyId      = $companyId
                    unitIds        = $unitIds
                    complianceRate = 0
                    lastRunAt      = $null
                    items          = $items
                    createdBy      = [int]$user.id
                    createdAt      = [DateTime]::UtcNow.ToString("o")
                }

                if (-not (Test-CollectionScope -CollectionName "checklists" -Record $record -User $user)) {
                    Send-ErrorResponse -Context $context -StatusCode 403 -Message "Checklist fora do escopo permitido." -Code "scope_forbidden"
                    continue
                }

                Add-EntityRecord -Database $db -CollectionName "checklists" -Record $record
                Add-HistoryEntry -Database $db -Module "checklists" -Action "created" -EntityId $record.id -ActorId $user.id -CompanyId $record.companyId -UnitId $record.unitIds[0] -Description "Checklist '$($record.name)' criado."
                Save-Database -DataFile $DataFile -Database $db
                Send-JsonResponse -Context $context -StatusCode 201 -Data @{ item = $record }
                continue
            }

            if ($path -eq "/api/safety-reports" -and $request.HttpMethod -eq "GET") {
                if (-not (Ensure-PermissionOrRespond -Context $context -User $user -Permission "safety.read")) { continue }
                Send-JsonResponse -Context $context -StatusCode 200 -Data @{ items = @(Get-ScopedCollection -Database $db -User $user -CollectionName "safetyReports" | Sort-Object createdAt -Descending) }
                continue
            }

            if ($path -eq "/api/safety-reports" -and $request.HttpMethod -eq "POST") {
                if (-not (Ensure-PermissionOrRespond -Context $context -User $user -Permission "safety.manage")) { continue }
                $payload = Get-JsonBody -Context $context
                if ($payload -eq $false) { continue }

                if ([string]::IsNullOrWhiteSpace($payload.title) -or -not $payload.unitId -or [string]::IsNullOrWhiteSpace($payload.severity)) {
                    Send-ErrorResponse -Context $context -StatusCode 400 -Message "Título, unidade e severidade são obrigatórios." -Code "validation_error"
                    continue
                }

                $unit = Resolve-Unit -Database $db -UnitId ([int]$payload.unitId)
                if (-not $unit) {
                    Send-ErrorResponse -Context $context -StatusCode 404 -Message "Unidade informada não existe." -Code "not_found"
                    continue
                }

                $record = @{
                    id          = Get-NextId -Database $db -CollectionName "safetyReports"
                    title       = $payload.title.Trim()
                    type        = $(if ($payload.type) { $payload.type } else { "Desvio" })
                    severity    = $payload.severity
                    status      = $(if ($payload.status) { $payload.status } else { "open" })
                    companyId   = [int]$unit.companyId
                    unitId      = [int]$unit.id
                    reportedBy  = [int]$user.id
                    description = $(if ($payload.description) { $payload.description.Trim() } else { "" })
                    createdAt   = [DateTime]::UtcNow.ToString("o")
                    dueDate     = $(if ($payload.dueDate) { $payload.dueDate } else { [DateTime]::UtcNow.AddDays(3).ToString("yyyy-MM-dd") })
                }

                if (-not (Test-CollectionScope -CollectionName "safetyReports" -Record $record -User $user)) {
                    Send-ErrorResponse -Context $context -StatusCode 403 -Message "Relato fora do seu escopo." -Code "scope_forbidden"
                    continue
                }

                Add-EntityRecord -Database $db -CollectionName "safetyReports" -Record $record
                Add-HistoryEntry -Database $db -Module "safety" -Action "created" -EntityId $record.id -ActorId $user.id -CompanyId $record.companyId -UnitId $record.unitId -Description "Relato '$($record.title)' registrado."
                Add-Notification -Database $db -UserId $user.id -Title "Relato registrado" -Message "Ocorrência '$($record.title)' adicionada com sucesso." -Level "success" -Link "safety"
                Save-Database -DataFile $DataFile -Database $db
                Send-JsonResponse -Context $context -StatusCode 201 -Data @{ item = $record }
                continue
            }

            if ($path -eq "/api/trainings" -and $request.HttpMethod -eq "GET") {
                if (-not (Ensure-PermissionOrRespond -Context $context -User $user -Permission "trainings.read")) { continue }
                Send-JsonResponse -Context $context -StatusCode 200 -Data @{ items = @(Get-ScopedCollection -Database $db -User $user -CollectionName "trainings" | Sort-Object dueDate) }
                continue
            }

            if ($path -eq "/api/trainings" -and $request.HttpMethod -eq "POST") {
                if (-not (Ensure-PermissionOrRespond -Context $context -User $user -Permission "trainings.manage")) { continue }
                $payload = Get-JsonBody -Context $context
                if ($payload -eq $false) { continue }

                if ([string]::IsNullOrWhiteSpace($payload.title) -or -not $payload.unitId -or [string]::IsNullOrWhiteSpace($payload.dueDate)) {
                    Send-ErrorResponse -Context $context -StatusCode 400 -Message "Título, unidade e data são obrigatórios." -Code "validation_error"
                    continue
                }

                $unit = Resolve-Unit -Database $db -UnitId ([int]$payload.unitId)
                if (-not $unit) {
                    Send-ErrorResponse -Context $context -StatusCode 404 -Message "Unidade informada não existe." -Code "not_found"
                    continue
                }

                $participants = @()
                foreach ($userId in (ConvertTo-IntArray $payload.participantIds)) {
                    $participants += @{
                        userId      = $userId
                        status      = "pending"
                        completedAt = $null
                        score       = $null
                    }
                }

                $record = @{
                    id           = Get-NextId -Database $db -CollectionName "trainings"
                    title        = $payload.title.Trim()
                    category     = $(if ($payload.category) { $payload.category.Trim() } else { "Operação" })
                    status       = $(if ($payload.status) { $payload.status } else { "scheduled" })
                    companyId    = [int]$unit.companyId
                    unitId       = [int]$unit.id
                    dueDate      = $payload.dueDate
                    instructor   = $(if ($payload.instructor) { $payload.instructor.Trim() } else { $user.name })
                    targetRoles  = @($(if ($payload.targetRoles) { @($payload.targetRoles) } else { @($user.role) }))
                    participants = $participants
                    createdBy    = [int]$user.id
                    createdAt    = [DateTime]::UtcNow.ToString("o")
                }

                if (-not (Test-CollectionScope -CollectionName "trainings" -Record $record -User $user)) {
                    Send-ErrorResponse -Context $context -StatusCode 403 -Message "Treinamento fora do escopo permitido." -Code "scope_forbidden"
                    continue
                }

                Add-EntityRecord -Database $db -CollectionName "trainings" -Record $record
                Add-HistoryEntry -Database $db -Module "trainings" -Action "created" -EntityId $record.id -ActorId $user.id -CompanyId $record.companyId -UnitId $record.unitId -Description "Treinamento '$($record.title)' cadastrado."

                foreach ($participant in @($record.participants)) {
                    Add-Notification -Database $db -UserId $participant.userId -Title "Novo treinamento" -Message $record.title -Level "info" -Link "trainings" | Out-Null
                }

                Save-Database -DataFile $DataFile -Database $db
                Send-JsonResponse -Context $context -StatusCode 201 -Data @{ item = $record }
                continue
            }

            if ($path -eq "/api/tickets" -and $request.HttpMethod -eq "GET") {
                if (-not (Ensure-PermissionOrRespond -Context $context -User $user -Permission "tickets.read")) { continue }
                Send-JsonResponse -Context $context -StatusCode 200 -Data @{ items = @(Get-ScopedCollection -Database $db -User $user -CollectionName "tickets" | Sort-Object openedAt -Descending) }
                continue
            }

            if ($path -eq "/api/tickets" -and $request.HttpMethod -eq "POST") {
                if (-not (Ensure-PermissionOrRespond -Context $context -User $user -Permission "tickets.manage")) { continue }
                $payload = Get-JsonBody -Context $context
                if ($payload -eq $false) { continue }

                if ([string]::IsNullOrWhiteSpace($payload.title) -or -not $payload.unitId) {
                    Send-ErrorResponse -Context $context -StatusCode 400 -Message "Título e unidade são obrigatórios." -Code "validation_error"
                    continue
                }

                $unit = Resolve-Unit -Database $db -UnitId ([int]$payload.unitId)
                if (-not $unit) {
                    Send-ErrorResponse -Context $context -StatusCode 404 -Message "Unidade informada não existe." -Code "not_found"
                    continue
                }

                $record = @{
                    id          = Get-NextId -Database $db -CollectionName "tickets"
                    title       = $payload.title.Trim()
                    category    = $(if ($payload.category) { $payload.category.Trim() } else { "Operação" })
                    priority    = $(if ($payload.priority) { $payload.priority } else { "medium" })
                    status      = $(if ($payload.status) { $payload.status } else { "open" })
                    companyId   = [int]$unit.companyId
                    unitId      = [int]$unit.id
                    requesterId = [int]$user.id
                    ownerId     = $(if ($payload.ownerId) { [int]$payload.ownerId } else { [int]$user.id })
                    description = $(if ($payload.description) { $payload.description.Trim() } else { "" })
                    openedAt    = [DateTime]::UtcNow.ToString("o")
                    dueDate     = $(if ($payload.dueDate) { $payload.dueDate } else { [DateTime]::UtcNow.AddDays(2).ToString("yyyy-MM-dd") })
                }

                if (-not (Test-CollectionScope -CollectionName "tickets" -Record $record -User $user)) {
                    Send-ErrorResponse -Context $context -StatusCode 403 -Message "Chamado fora do escopo permitido." -Code "scope_forbidden"
                    continue
                }

                Add-EntityRecord -Database $db -CollectionName "tickets" -Record $record
                Add-HistoryEntry -Database $db -Module "tickets" -Action "created" -EntityId $record.id -ActorId $user.id -CompanyId $record.companyId -UnitId $record.unitId -Description "Chamado '$($record.title)' aberto."
                Add-Notification -Database $db -UserId $record.ownerId -Title "Novo chamado" -Message $record.title -Level "warning" -Link "tickets"
                Save-Database -DataFile $DataFile -Database $db
                Send-JsonResponse -Context $context -StatusCode 201 -Data @{ item = $record }
                continue
            }

            if ($path -eq "/api/notifications" -and $request.HttpMethod -eq "GET") {
                if (-not (Ensure-PermissionOrRespond -Context $context -User $user -Permission "notifications.view")) { continue }
                $items = @(Get-ScopedCollection -Database $db -User $user -CollectionName "notifications" | Sort-Object createdAt -Descending)
                Send-JsonResponse -Context $context -StatusCode 200 -Data @{
                    items      = $items
                    unreadCount = (@($items | Where-Object { -not $_.read })).Count
                }
                continue
            }

            if ($path -match "^/api/notifications/(\d+)/read$" -and $request.HttpMethod -eq "PATCH") {
                if (-not (Ensure-PermissionOrRespond -Context $context -User $user -Permission "notifications.view")) { continue }
                $notificationId = [int]$matches[1]
                $notification = @($db.notifications | Where-Object { $_.id -eq $notificationId }) | Select-Object -First 1
                if (-not $notification -or [int]$notification.userId -ne [int]$user.id) {
                    Send-ErrorResponse -Context $context -StatusCode 404 -Message "Notificação não encontrada." -Code "not_found"
                    continue
                }

                $notification.read = $true
                Save-Database -DataFile $DataFile -Database $db
                Send-JsonResponse -Context $context -StatusCode 200 -Data @{ item = $notification }
                continue
            }

            if ($path -eq "/api/history" -and $request.HttpMethod -eq "GET") {
                if (-not (Ensure-PermissionOrRespond -Context $context -User $user -Permission "history.view")) { continue }
                Send-JsonResponse -Context $context -StatusCode 200 -Data @{ items = @(Get-ScopedCollection -Database $db -User $user -CollectionName "history" | Sort-Object createdAt -Descending | Select-Object -First 40) }
                continue
            }

            if ($path -eq "/api/reports/summary" -and $request.HttpMethod -eq "GET") {
                if (-not (Ensure-PermissionOrRespond -Context $context -User $user -Permission "reports.view")) { continue }
                Send-JsonResponse -Context $context -StatusCode 200 -Data (Get-ReportsSummary -Database $db -User $user)
                continue
            }

            if ($path -eq "/api/reports/export" -and $request.HttpMethod -eq "GET") {
                if (-not (Ensure-PermissionOrRespond -Context $context -User $user -Permission "reports.export")) { continue }
                $entity = $request.QueryString["entity"]
                $map = @{
                    tasks         = "tasks"
                    checklists    = "checklists"
                    safetyReports = "safetyReports"
                    trainings     = "trainings"
                    tickets       = "tickets"
                }

                if (-not $map.ContainsKey($entity)) {
                    Send-ErrorResponse -Context $context -StatusCode 400 -Message "Escolha um tipo de exportação válido." -Code "validation_error"
                    continue
                }

                $items = Get-ScopedCollection -Database $db -User $user -CollectionName $map[$entity]
                $csv = Convert-CollectionToCsv -Items $items
                $db.meta.lastExport = [DateTime]::UtcNow.ToString("o")
                Save-Database -DataFile $DataFile -Database $db
                Send-TextResponse -Context $context -StatusCode 200 -Text $csv -ContentType "text/csv; charset=utf-8"
                continue
            }

            Send-ErrorResponse -Context $context -StatusCode 404 -Message "Endpoint não encontrado." -Code "not_found"
        }
        catch {
            Send-ErrorResponse -Context $context -StatusCode 500 -Message "Erro interno ao processar a requisição." -Code "internal_error" -Details $_.Exception.Message
        }
    }
}
finally {
    if ($proxy) {
        $proxy.Dispose()
    }
    if ($listener.IsListening) {
        $listener.Stop()
    }
    $listener.Close()
}
