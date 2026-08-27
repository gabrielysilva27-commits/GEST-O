function Get-Sha256Hash {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Value
    )

    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Value)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $hashBytes = $sha.ComputeHash($bytes)
    }
    finally {
        $sha.Dispose()
    }

    return ([System.BitConverter]::ToString($hashBytes)).Replace("-", "").ToLowerInvariant()
}

function Get-RolePermissions {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Role
    )

    $matrix = @{
        admin = @(
            "dashboard.view",
            "users.read",
            "users.manage",
            "companies.read",
            "companies.manage",
            "units.read",
            "units.manage",
            "tasks.read",
            "tasks.manage",
            "checklists.read",
            "checklists.manage",
            "safety.read",
            "safety.manage",
            "trainings.read",
            "trainings.manage",
            "tickets.read",
            "tickets.manage",
            "reports.view",
            "reports.export",
            "notifications.view",
            "history.view"
        )
        manager = @(
            "dashboard.view",
            "users.read",
            "companies.read",
            "units.read",
            "tasks.read",
            "tasks.manage",
            "checklists.read",
            "checklists.manage",
            "safety.read",
            "safety.manage",
            "trainings.read",
            "trainings.manage",
            "tickets.read",
            "tickets.manage",
            "reports.view",
            "reports.export",
            "notifications.view",
            "history.view"
        )
        supervisor = @(
            "dashboard.view",
            "units.read",
            "tasks.read",
            "tasks.manage",
            "checklists.read",
            "checklists.manage",
            "safety.read",
            "safety.manage",
            "trainings.read",
            "trainings.manage",
            "tickets.read",
            "tickets.manage",
            "reports.view",
            "notifications.view",
            "history.view"
        )
        operator = @(
            "dashboard.view",
            "tasks.read",
            "checklists.read",
            "safety.read",
            "safety.manage",
            "trainings.read",
            "tickets.read",
            "tickets.manage",
            "notifications.view"
        )
    }

    if ($matrix.ContainsKey($Role)) {
        return $matrix[$Role]
    }

    return @()
}

function Test-Permission {
    param(
        [Parameter(Mandatory = $true)]
        $User,
        [Parameter(Mandatory = $true)]
        [string]$Permission
    )

    $permissions = @($User.permissions)
    return $permissions -contains $Permission
}

function Get-BearerToken {
    param(
        [Parameter(Mandatory = $true)]
        $Request
    )

    $header = $Request.Headers["Authorization"]
    if ([string]::IsNullOrWhiteSpace($header)) {
        return $null
    }

    if ($header -match "^Bearer\s+(.+)$") {
        return $matches[1].Trim()
    }

    return $null
}
