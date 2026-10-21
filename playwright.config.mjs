import { defineConfig } from '@playwright/test';
const requested=process.env.PLAYWRIGHT_CHANNEL;
export default defineConfig({testDir:'tests/browser',timeout:120000,workers:2,reporter:'list',outputDir:'artifacts/browser',use:{baseURL:'http://127.0.0.1:4173',headless:true,channel:requested==='chromium'?undefined:requested||(process.platform==='darwin'?'chrome':undefined),trace:'retain-on-failure'},webServer:{command:'node scripts/serve.mjs',url:'http://127.0.0.1:4173',reuseExistingServer:!process.env.CI,timeout:20000}});
