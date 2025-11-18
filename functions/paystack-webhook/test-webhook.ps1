# PowerShell script to test Paystack webhook
# This script sends a POST request with a mock Paystack webhook payload

$webhookUrl = "https://fundify-paystack-worker.danfrankline.workers.dev"
$paystackSecret = $env:PAYSTACK_SECRET_KEY

if (-not $paystackSecret) {
    Write-Host "Error: PAYSTACK_SECRET_KEY environment variable not set" -ForegroundColor Red
    Write-Host "Please set it with: `$env:PAYSTACK_SECRET_KEY = 'sk_test_...'" -ForegroundColor Yellow
    exit 1
}

# Sample webhook payload
$payload = @{
    event = "charge.success"
    data = @{
        id = 1234567890
        domain = "test"
        status = "success"
        reference = "DONATION_$(Get-Date -Format 'yyyyMMddHHmmss')"
        amount = 500000  # 5000.00 in kobo
        message = "Successful"
        gateway_response = "Successful"
        paid_at = (Get-Date).ToUniversalTime().ToString("o")
        created_at = (Get-Date).ToUniversalTime().ToString("o")
        channel = "card"
        currency = "NGN"
        ip_address = "127.0.0.1"
        metadata = @{
            orgId = "test-org-id"  # Replace with a real org ID from your Firestore
            walletId = "test-funder-id"
            funderId = "test-funder-id"
            userId = "test-user-id"
            email = "test@example.com"
            name = "Test Donor"
            description = "Test contribution"
            currency = "NGN"
        }
        customer = @{
            id = 123456
            first_name = "Test"
            last_name = "Donor"
            email = "test@example.com"
            customer_code = "CUS_test123"
        }
        authorization = @{
            authorization_code = "AUTH_test123"
            bin = "408408"
            last4 = "4081"
            exp_month = "12"
            exp_year = "2030"
            channel = "card"
            card_type = "visa"
            country_code = "NG"
            brand = "visa"
            reusable = $true
        }
        paidAt = (Get-Date).ToUniversalTime().ToString("o")
        createdAt = (Get-Date).ToUniversalTime().ToString("o")
        requested_amount = 500000
    }
} | ConvertTo-Json -Depth 10

# Generate HMAC SHA512 signature
function Get-HmacSignature {
    param(
        [string]$message,
        [string]$secret
    )
    $hmac = New-Object System.Security.Cryptography.HMACSHA512
    $hmac.Key = [System.Text.Encoding]::UTF8.GetBytes($secret)
    $hash = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($message))
    return ([System.BitConverter]::ToString($hash)).Replace("-", "").ToLower()
}

$signature = Get-HmacSignature -message $payload -secret $paystackSecret

Write-Host "Testing webhook at: $webhookUrl" -ForegroundColor Cyan
Write-Host "Payload: $payload" -ForegroundColor Gray
Write-Host "Signature: $signature" -ForegroundColor Gray
Write-Host "`nSending POST request...`n" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $webhookUrl -Method Post -Body $payload -ContentType "application/json" -Headers @{
        "x-paystack-signature" = $signature
    }
    
    Write-Host "Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
    Write-Host "`n✅ Webhook test successful!" -ForegroundColor Green
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Red
    }
}

