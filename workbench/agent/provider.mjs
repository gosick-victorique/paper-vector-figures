// Responses-compatible services do not necessarily implement WebSocket upgrades.
// Keep credentials in the SDK's child environment, never in CLI config arguments.
export function providerConfig(baseUrl){
 return {model_provider:'figure_api',model_providers:{figure_api:{
  name:'Figure Studio API',base_url:baseUrl,wire_api:'responses',
  env_key:'CODEX_API_KEY',supports_websockets:false
 }}};
}
