# Simple webhook test script
# Usage: .\test-webhook-simple.ps1

param(
    [string]$PaystackSecret = "",
    [string]$OrgId = ""
)

$webhookUrl = "https://fundify-paystack-worker.danfrankline.workers.dev"

if (-not $PaystackSecret) {
    $PaystackSecret = Read-Host "Enter your Paystack Secret Key (sk_test_...)"
}

if (-not $OrgId) {
    $OrgId = Read-Host "Enter your Organization ID (from Firestore)"
}

# Create test payload
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$payload = @{
    event = "charge.success"
    data = @{
        id = 1234567890
        status = "success"
        reference = "TEST_$timestamp"
        amount = 500000  # 5000.00 NGN in kobo
        currency = "NGN"
        channel = "card"
        paid_at = (Get-Date).ToUniversalTime().ToString("o")
        created_at = (Get-Date).ToUniversalTime().ToString("o")
        metadata = @{
            orgId = $OrgId
            walletId = "TEST_WALLET"
            funderId = "TEST_FUNDER"
            userId = "TEST_USER"
            email = "test@example.com"
            name = "Test Donor"
            description = "Test contribution from webhook"
            currency = "NGN"
        }
        customer = @{
            email = "test@example.com"
            first_name = "Test"
            last_name = "Donor"
        }
    }
} | ConvertTo-Json -Depth 10 -Compress

# Generate HMAC SHA512 signature
$hmac = New-Object System.Security.Cryptography.HMACSHA512
$hmac.Key = [System.Text.Encoding]::UTF8.GetBytes($PaystackSecret)
$hash = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($payload))
$signature = ([System.BitConverter]::ToString($hash)).Replace("-", "").ToLower()

Write-Host "`n🧪 Testing Webhook" -ForegroundColor Cyan
Write-Host "URL: $webhookUrl" -ForegroundColor Gray
Write-Host "Reference: TEST_$timestamp" -ForegroundColor Gray
Write-Host "Amount: 5000.00 NGN" -ForegroundColor Gray
Write-Host "`nSending request...`n" -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri $webhookUrl -Method Post -Body $payload -ContentType "application/json" -Headers @{
        "x-paystack-signature" = $signature
    } -UseBasicParsing

    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host "Status: $($response.StatusCode) $($response.StatusDescription)" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ ERROR" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    } else {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n💡 Tip: Check 'wrangler tail' in another terminal to see detailed logs" -ForegroundColor Cyan

