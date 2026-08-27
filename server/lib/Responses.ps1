function Get-RequestBody {
    param(
        [Parameter(Mandatory = $true)]
        $Request
    )

    if (-not $Request.HasEntityBody) {
        return $null
    }

    $reader = New-Object System.IO.StreamReader($Request.InputStream, $Request.ContentEncoding)
    try {
        $content = $reader.ReadToEnd()
    }
    finally {
        $reader.Dispose()
    }

    if ([string]::IsNullOrWhiteSpace($content)) {
        return $null
    }

    return $content
}

function Send-BytesResponse {
    param(
        [Parameter(Mandatory = $true)]
        $Context,
        [Parameter(Mandatory = $true)]
        [int]$StatusCode,
        [Parameter(Mandatory = $true)]
        [byte[]]$Bytes,
        [Parameter(Mandatory = $true)]
        [string]$ContentType
    )

    $response = $Context.Response
    $response.StatusCode = $StatusCode
    $response.ContentType = $ContentType
    $response.ContentEncoding = [System.Text.Encoding]::UTF8
    $response.Headers["Cache-Control"] = "no-store"
    $response.Headers["X-Content-Type-Options"] = "nosniff"
    $response.ContentLength64 = $Bytes.Length
    $response.OutputStream.Write($Bytes, 0, $Bytes.Length)
    $response.OutputStream.Close()
}

function Send-JsonResponse {
    param(
        [Parameter(Mandatory = $true)]
        $Context,
        [Parameter(Mandatory = $true)]
        [int]$StatusCode,
        [Parameter(Mandatory = $true)]
        $Data
    )

    $json = $Data | ConvertTo-Json -Depth 12
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    Send-BytesResponse -Context $Context -StatusCode $StatusCode -Bytes $bytes -ContentType "application/json; charset=utf-8"
}

function Send-TextResponse {
    param(
        [Parameter(Mandatory = $true)]
        $Context,
        [Parameter(Mandatory = $true)]
        [int]$StatusCode,
        [Parameter(Mandatory = $true)]
        [string]$Text,
        [string]$ContentType = "text/plain; charset=utf-8"
    )

    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
    Send-BytesResponse -Context $Context -StatusCode $StatusCode -Bytes $bytes -ContentType $ContentType
}

function Send-ErrorResponse {
    param(
        [Parameter(Mandatory = $true)]
        $Context,
        [Parameter(Mandatory = $true)]
        [int]$StatusCode,
        [Parameter(Mandatory = $true)]
        [string]$Message,
        [string]$Code = "request_error",
        $Details = $null
    )

    $payload = @{
        error = @{
            code    = $Code
            message = $Message
        }
    }

    if ($null -ne $Details) {
        $payload.error.details = $Details
    }

    Send-JsonResponse -Context $Context -StatusCode $StatusCode -Data $payload
}

function Send-NoContentResponse {
    param(
        [Parameter(Mandatory = $true)]
        $Context
    )

    $response = $Context.Response
    $response.StatusCode = 204
    $response.Headers["Cache-Control"] = "no-store"
    $response.OutputStream.Close()
}

function Send-OptionsResponse {
    param(
        [Parameter(Mandatory = $true)]
        $Context
    )

    $response = $Context.Response
    $response.StatusCode = 204
    $response.Headers["Allow"] = "GET,POST,PATCH,OPTIONS"
    $response.OutputStream.Close()
}
