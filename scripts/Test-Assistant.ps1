param([string]$ApiBase='http://localhost:8081', [string]$Output='.local/assistant-verification.json')
$ErrorActionPreference='Stop'
$uri=[uri]$ApiBase
if($uri.Host -notin @('localhost','127.0.0.1')){throw 'Ovaj test je namijenjen isključivo lokalnoj demonstraciji.'}
if(-not $env:AISHOP_TEST_EMAIL -or -not $env:AISHOP_TEST_PASSWORD){throw 'Postavite AISHOP_TEST_EMAIL i AISHOP_TEST_PASSWORD u proces prije testa.'}
function Login($email,$password){Invoke-RestMethod ($ApiBase+'/api/auth/login') -Method Post -ContentType application/json -Body (@{email=$email;password=$password}|ConvertTo-Json)}
$auth=Login $env:AISHOP_TEST_EMAIL $env:AISHOP_TEST_PASSWORD
$headers=@{Authorization=('Bearer '+$auth.accessToken)}
$products=Invoke-RestMethod ($ApiBase+'/api/products')
$product=$products|Where-Object {$_.categoryName -eq 'Laptopi' -and $_.stock -gt 0 -and $_.price -le 2000}|Sort-Object price|Select-Object -First 1
if(-not $product){throw 'Za demo je potreban laptop na stanju do 2000 KM.'}
$before=Invoke-RestMethod ($ApiBase+'/api/cart') -Headers $headers
$oldItem=$before.items|Where-Object productId -eq $product.id|Select-Object -First 1
$conversation=Invoke-RestMethod ($ApiBase+'/api/ai/conversations') -Headers $headers -Method Post
$headers['X-Chat-Request-ID']=[guid]::NewGuid().ToString()
$endpoint=$ApiBase+'/api/ai/conversations/'+$conversation.id+'/chat'
$question=@{message='Koji laptopi su na stanju do 2000 KM?'}|ConvertTo-Json
$reply=Invoke-RestMethod $endpoint -Headers $headers -Method Post -ContentType application/json -Body $question -TimeoutSec 60
$again=Invoke-RestMethod $endpoint -Headers $headers -Method Post -ContentType application/json -Body $question -TimeoutSec 60
$detail=Invoke-RestMethod ($ApiBase+'/api/ai/conversations/'+$conversation.id) -Headers $headers
$report=[ordered]@{conversationId=$conversation.id;catalogVerified=$false;requestDeduplicated=$false;historyPersisted=$false;confirmationRequired=$false;oneTimeConfirmed=$false;isolationVerified=$false;cartRestored=$false}
$expectedPrice=([decimal]$product.price).ToString('N2',[Globalization.CultureInfo]::GetCultureInfo('de-DE'))
$report.catalogVerified=$reply.reply.Contains($product.name) -and $reply.reply.Contains($expectedPrice)
$report.requestDeduplicated=$reply.reply -eq $again.reply -and $detail.messages.Count -eq 2
$report.historyPersisted=$detail.messages[0].content -eq 'Koji laptopi su na stanju do 2000 KM?'
$headers['X-Chat-Request-ID']=[guid]::NewGuid().ToString()
$proposal=Invoke-RestMethod $endpoint -Headers $headers -Method Post -ContentType application/json -Body (@{message='Dodaj taj laptop u korpu, jedan komad.'}|ConvertTo-Json) -TimeoutSec 60
$action=$proposal.pendingActions|Select-Object -First 1
$cart=Invoke-RestMethod ($ApiBase+'/api/cart') -Headers $headers
$report.confirmationRequired=($cart.totalItems -eq $before.totalItems) -and $action.type -eq 'ADD' -and $action.productId -eq $product.id
if($report.confirmationRequired){
    try {
        $null=Invoke-RestMethod ($ApiBase+'/api/ai/cart-actions/'+$action.actionId+'/confirm') -Headers $headers -Method Post
        $confirmed=Invoke-RestMethod ($ApiBase+'/api/cart') -Headers $headers
        $repeat=Invoke-WebRequest ($ApiBase+'/api/ai/cart-actions/'+$action.actionId+'/confirm') -Headers $headers -Method Post -SkipHttpErrorCheck
        $after=Invoke-RestMethod ($ApiBase+'/api/cart') -Headers $headers
        $report.oneTimeConfirmed=$confirmed.totalItems -eq ($before.totalItems+1) -and $after.totalItems -eq $confirmed.totalItems -and $repeat.StatusCode -in @(200,409,410,404)
    } finally {
        $current=Invoke-RestMethod ($ApiBase+'/api/cart') -Headers $headers
        $item=$current.items|Where-Object productId -eq $product.id|Select-Object -First 1
        if($item){
            if($oldItem){$null=Invoke-RestMethod ($ApiBase+'/api/cart/items/'+$item.id) -Headers $headers -Method Put -ContentType application/json -Body (@{quantity=$oldItem.quantity}|ConvertTo-Json)}
            else {$null=Invoke-RestMethod ($ApiBase+'/api/cart/items/'+$item.id) -Headers $headers -Method Delete}
        }
        $restored=Invoke-RestMethod ($ApiBase+'/api/cart') -Headers $headers
        $report.cartRestored=$restored.totalItems -eq $before.totalItems
    }
}
if($env:AISHOP_OTHER_EMAIL -and $env:AISHOP_OTHER_PASSWORD){
    $other=Login $env:AISHOP_OTHER_EMAIL $env:AISHOP_OTHER_PASSWORD
    $r=Invoke-WebRequest ($ApiBase+'/api/ai/conversations/'+$conversation.id) -Headers @{Authorization=('Bearer '+$other.accessToken)} -SkipHttpErrorCheck
    $report.isolationVerified=$r.StatusCode -eq 404
}
$outputParent=Split-Path -Parent $Output
if($outputParent){New-Item -ItemType Directory -Force -Path $outputParent|Out-Null}
$report|ConvertTo-Json|Set-Content -LiteralPath $Output -Encoding utf8
$report|ConvertTo-Json
if(@($report.Keys|Where-Object {$_ -ne 'conversationId' -and -not $report[$_]}).Count){throw 'Nisu prošle sve provjere; pogledajte izvještaj.'}
