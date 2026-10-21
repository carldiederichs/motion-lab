import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const input=process.argv[2];if(!input)throw Error('Usage: node scripts/verify.mjs local/example.html');
const requested=process.env.PLAYWRIGHT_CHANNEL;
const channel=requested==='chromium'?undefined:requested || (process.platform==='darwin'?'chrome':undefined);
const browser=await chromium.launch({channel,headless:true});let failed=false;
try{for(const theme of ['dark','light']){
  const page=await browser.newPage({viewport:{width:1440,height:1000},colorScheme:theme});
  await page.goto(pathToFileURL(path.resolve(input)).href+`?motion-qa=1&theme=${theme}`);
  await page.waitForSelector('#motion-qa-report',{state:'attached',timeout:60000});
  const report=JSON.parse(await page.locator('#motion-qa-report').textContent());
  console.log(JSON.stringify({theme,...report}));failed ||= report.status!=='ok';await page.close();
}}finally{await browser.close();}process.exitCode=failed?1:0;
