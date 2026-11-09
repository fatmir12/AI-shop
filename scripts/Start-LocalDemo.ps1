param([string]$ConfigPath='.local/runtime.json')
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
Set-Location $root
if(Test-Path -LiteralPath $ConfigPath){
    $config=Get-Content -LiteralPath $ConfigPath -Raw|ConvertFrom-Json
    $config.PSObject.Properties|ForEach-Object {[Environment]::SetEnvironmentVariable($_.Name,$_.Value,'Process')}
}
if(-not $env:STRIPE_API_KEY -or -not $env:STRIPE_API_KEY.StartsWith('sk_test_')){throw 'Demo zahtijeva Stripe testni ključ.'}
if(-not $env:JAVA_HOME){throw 'Postavite JAVA_HOME na JDK 25 ili noviji.'}
$logs=Join-Path $root '.local'
New-Item -ItemType Directory -Path $logs -Force|Out-Null
if(-not(Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue)){
    $jar=Join-Path $root 'bekend/target/backend-0.0.1-SNAPSHOT.jar'
    if(-not(Test-Path $jar)){throw 'Prvo izgradite backend.'}
    Start-Process (Join-Path $env:JAVA_HOME 'bin/java.exe') -ArgumentList @('-jar',$jar) -WorkingDirectory (Join-Path $root 'bekend') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logs 'backend.log') -RedirectStandardError (Join-Path $logs 'backend.err.log')
}
if(-not(Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue)){
    $env:VITE_DATA_SOURCE='api'
    $env:VITE_API_BASE_URL='/api'
    Start-Process (Get-Command node.exe).Source -ArgumentList @('node_modules/vite/bin/vite.js','--host','127.0.0.1') -WorkingDirectory (Join-Path $root 'frontend') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logs 'frontend.log') -RedirectStandardError (Join-Path $logs 'frontend.err.log')
}
Write-Output 'Prodavnica: http://localhost:5173/ | Admin: http://localhost:5173/admin'
Write-Output 'Za lokalne webhook događaje zasebno pokrenite stripe listen prema docs/demonstracija.md.'
