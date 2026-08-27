param(
    [int]$Port = 8097
)

$ErrorActionPreference = "Stop"

function Assert-True {
    param(
        [Parameter(Mandatory = $true)]
        [bool]$Condition,
        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    if (-not $Condition) {
        throw $Message
    }
}

function Assert-Equal {
    param(
        [Parameter(Mandatory = $true)]
        $Actual,
        [Parameter(Mandatory = $true)]
        $Expected,
        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    if ($Actual -ne $Expected) {
        throw "$Message. Esperado: $Expected. Atual: $Actual."
    }
}

function Wait-ForServer {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Url,
        [Parameter(Mandatory = $true)]
        [int]$TimeoutSeconds
    )

    $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
    while ([DateTime]::UtcNow -lt $deadline) {
        try {
            $result = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 3
            if ($result.status -eq "ok") {
                return
            }
        }
        catch {
            Start-Sleep -Milliseconds 300
        }
    }

    throw "Servidor não respondeu em até $TimeoutSeconds segundos."
}

function Invoke-Api {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Uri,
        [Parameter(Mandatory = $true)]
        [string]$Method,
        [hashtable]$Headers = @{},
        $Body = $null
    )

    $params = @{
        Uri         = $Uri
        Method      = $Method
        Headers     = $Headers
        TimeoutSec  = 10
        ErrorAction = "Stop"
    }

    if ($null -ne $Body) {
        $params.Body = ($Body | ConvertTo-Json -Compress -Depth 10)
        $params.ContentType = "application/json"
    }

    return Invoke-RestMethod @params
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$serverScript = Join-Path $projectRoot "server\server.ps1"
$serverBinary = Join-Path $PSHOME "powershell.exe"
$tempDb = Join-Path $env:TEMP ("lead-tests-{0}.json" -f [guid]::NewGuid().ToString("N"))
$stdoutLog = Join-Path $env:TEMP ("lead-tests-{0}.out.log" -f [guid]::NewGuid().ToString("N"))
$stderrLog = Join-Path $env:TEMP ("lead-tests-{0}.err.log" -f [guid]::NewGuid().ToString("N"))
$baseUrl = "http://localhost:$Port"
$process = $null

try {
    $argumentLine = "-ExecutionPolicy Bypass -File `"$serverScript`" -Port $Port -DataFile `"$tempDb`""
    $process = Start-Process -FilePath $serverBinary -WindowStyle Hidden -ArgumentList $argumentLine -WorkingDirectory $projectRoot -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog -PassThru

    Wait-ForServer -Url "$baseUrl/api/health" -TimeoutSeconds 20

    $health = Invoke-Api -Uri "$baseUrl/api/health" -Method "Get"
    Assert-Equal -Actual $health.status -Expected "ok" -Message "Healthcheck deveria retornar ok"
    $expectedAppName = "LEAD Gest$([char]0x00E3)o"
    Assert-Equal -Actual $health.app -Expected $expectedAppName -Message "A API deveria expor a marca correta"

    $adminSession = Invoke-Api -Uri "$baseUrl/api/auth/login" -Method "Post" -Body @{
        username = "Gabriely"
        password = "gaby0739"
    }

    Assert-True -Condition ([string]::IsNullOrWhiteSpace($adminSession.token) -eq $false) -Message "Login admin deveria retornar token"
    Assert-Equal -Actual $adminSession.user.username -Expected "Gabriely" -Message "O usuário autenticado deveria ser Gabriely"
    Assert-Equal -Actual $adminSession.user.role -Expected "admin" -Message "Gabriely deveria ter perfil admin"

    $adminHeaders = @{ Authorization = "Bearer $($adminSession.token)" }
    $me = Invoke-Api -Uri "$baseUrl/api/auth/me" -Method "Get" -Headers $adminHeaders
    Assert-Equal -Actual $me.user.username -Expected "Gabriely" -Message "Auth/me deveria retornar o usuário logado"

    $dashboard = Invoke-Api -Uri "$baseUrl/api/dashboard" -Method "Get" -Headers $adminHeaders
    Assert-True -Condition (($dashboard.kpis | Measure-Object).Count -ge 4) -Message "Dashboard deveria expor cartões de KPI"

    $createdUser = Invoke-Api -Uri "$baseUrl/api/users" -Method "Post" -Headers $adminHeaders -Body @{
        name     = "Novo Operador"
        username = "novo.operador"
        password = "SenhaTeste@123"
        role     = "operator"
    }
    Assert-Equal -Actual $createdUser.item.username -Expected "novo.operador" -Message "O usuário criado deveria ser devolvido pela API"

    $users = Invoke-Api -Uri "$baseUrl/api/users" -Method "Get" -Headers $adminHeaders
    Assert-True -Condition ((@($users.items | Where-Object { $_.username -eq "novo.operador" })).Count -eq 1) -Message "O novo usuário deveria estar listado"

    $operatorSession = Invoke-Api -Uri "$baseUrl/api/auth/login" -Method "Post" -Body @{
        username = "novo.operador"
        password = "SenhaTeste@123"
    }
    $operatorHeaders = @{ Authorization = "Bearer $($operatorSession.token)" }

    $forbiddenStatus = 0
    try {
        Invoke-Api -Uri "$baseUrl/api/users" -Method "Get" -Headers $operatorHeaders | Out-Null
    }
    catch {
        $forbiddenStatus = $_.Exception.Response.StatusCode.value__
    }
    Assert-Equal -Actual $forbiddenStatus -Expected 403 -Message "Operador não deveria acessar o módulo de usuários"

    $homeResponse = Invoke-WebRequest -Uri $baseUrl -TimeoutSec 10 -UseBasicParsing
    Assert-True -Condition ($homeResponse.Content -match "LEAD") -Message "O frontend deveria carregar a identidade LEAD"
    Assert-True -Condition ($homeResponse.Content -match 'name="username"') -Message "A tela inicial deveria usar login por usuário"
    Assert-True -Condition ($homeResponse.Content -match 'workspace-shell') -Message "A estrutura da plataforma deveria existir após o login"

    Write-Host "Todos os testes passaram com sucesso."
}
finally {
    if ($process -and -not $process.HasExited) {
        Stop-Process -Id $process.Id -Force
    }

    foreach ($path in @($tempDb, $stdoutLog, $stderrLog)) {
        if (Test-Path -LiteralPath $path) {
            Remove-Item -LiteralPath $path -Force
        }
    }
}
