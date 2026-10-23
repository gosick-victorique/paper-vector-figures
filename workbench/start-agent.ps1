$ErrorActionPreference = 'Stop'
$figureRoot = $PSScriptRoot
$figureNode = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $figureNode) { throw 'Node.js is required. Install Node.js 22 or later.' }
if (-not (Test-Path -LiteralPath (Join-Path $figureRoot 'node_modules/@openai/codex-sdk'))) {
    throw 'Dependencies missing. Run npm ci in this folder first.'
}
Write-Host 'Open http://127.0.0.1:4318/ and configure the API connection in the Agent panel.'
& $figureNode (Join-Path $figureRoot 'agent/server.mjs')
