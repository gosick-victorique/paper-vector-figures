module.exports={
 appId:'org.figurestudio.workbench',productName:'Figure Studio',asar:false,npmRebuild:false,
 directories:{output:'desktop-dist'},
 files:[
  'package.json','*.js','*.css','index.html','desktop/main.cjs','desktop/icon.png',
  'agent/*.mjs','agent/*.cjs','agent/patch-contract.js','agent/client.js','agent/panel.css','agent/prompts/*.md',
  'external-icons/index.html','external-icons/catalog.js','external-icons/manifest.json','external-icons/svg/**/*','external-icons/licenses/**/*','external-icons/README.md',
  'foundations/*.svg','foundations/index.html','foundations/manifest.json',
  'paper-inspiration/redrawn/**/*','paper-inspiration/index.html',
  '!**/*.test.*','!agent/*smoke*','!desktop/prepare.cjs','!electron-builder.cjs',
  '!node_modules/.cache/**/*'
 ],
 extraResources:[{from:'.desktop-resources/skill',to:'skill',filter:['**/*.md']}],
 win:{target:[{target:'portable',arch:['x64']}],icon:'desktop/icon.ico',signExecutable:false},
 portable:{artifactName:'Figure-Studio-${version}-Windows-x64.exe'},
 compression:'normal'
};
