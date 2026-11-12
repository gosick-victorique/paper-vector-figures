const {defineConfig}=require('@playwright/test');
module.exports=defineConfig({
 testDir:'./tests/browser',timeout:45000,workers:1,
 use:{baseURL:'http://127.0.0.1:4329',headless:true,channel:process.platform==='win32'?'msedge':undefined,acceptDownloads:true,trace:'retain-on-failure'},
 webServer:{command:'node tests/browser-server.mjs',url:'http://127.0.0.1:4329',reuseExistingServer:false,timeout:20000},
});
