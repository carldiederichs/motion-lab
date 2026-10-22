# Motion Lab

Motion Lab explains algorithms and software systems through interactive diagrams. Step through a request, change an input or compare two designs, then follow how the data and state change. Code examples are available in TypeScript, JavaScript, Python, Java and C++.

[Explore the live demo](https://motion-lab-dev.vercel.app/) in your browser, or run the toolkit locally to create explanations with your own AI coding assistant. The hosted site contains prepared examples and does not require an account or provide model access.

## Run locally

Install Node.js 22.13 or newer, then run these commands in your terminal:

```sh
git clone https://github.com/carldiederichs/motion-lab.git
cd motion-lab
npm ci --ignore-scripts
npm run dev
```

Keep the terminal running and open the local address it prints in your browser. Press `Ctrl+C` in that terminal when you want to stop the server.

If you prefer not to use Git, [download the toolkit](https://motion-lab-dev.vercel.app/downloads/motion-lab-toolkit.zip), extract it and open its `motion-lab` folder in a terminal. Run the two `npm` commands above to install dependencies and start the server.

## Create with your coding assistant

Open the `motion-lab` project folder in your coding assistant. It needs permission to read and write project files and run the local builder.

### Codex

Codex discovers the included skill from `.agents/skills/motion-lab/SKILL.md`. Enter this in **Codex's chat input**:

```text
$motion-lab Explain why a retry can create duplicate records. Show the broken version and a version that uses an idempotency key.
```

The `$motion-lab` prefix selects a Codex skill; it is not a terminal command or Windows-specific syntax. Replace the example question with your own code, system or engineering question. If the skill does not appear, check that Codex is open in this project folder and restart Codex. See [Codex skills](https://developers.openai.com/codex/skills/) for discovery and invocation details.

### Other coding assistants

If your assistant does not discover the repository skill automatically, give it the file path in its chat:

```text
Read .agents/skills/motion-lab/SKILL.md and use it to explain why a retry can create duplicate records. Show the broken and safe versions, build the visualization and verify the result.
```

The skill guides your assistant through choosing a diagram, creating the explanation and checking its output. It saves generated files in `local/`, which is excluded from the public build and toolkit archive. The examples are starting points; you can ask about other algorithms, architecture, requests and state changes.

Use your own assistant and model. Motion Lab does not handle API keys or bill for model usage. Your assistant may send project context to its provider according to its own permissions and privacy settings.

## Create without an assistant

In a second terminal, open the project folder and create a visualization from a template:

```sh
npx tsx scripts/cli.ts new my-flow --template request-sequence
```

Edit `local/my-flow.json`, then validate and build it:

```sh
npx tsx scripts/cli.ts validate local/my-flow.json
npx tsx scripts/cli.ts build local/my-flow.json
```

Open `local/my-flow.html` in your browser. The JSON describes actors, connections, explanations and changes over time; it does not execute arbitrary code. The [authoring guide](docs/AUTHORING.md) covers the available diagram types and templates.

## Verify a visualization

Before sharing a generated explanation, install the verification browser and run the player checks:

```sh
npx playwright install chromium
npx tsx scripts/verify.ts local/my-flow.html
```

The verifier checks both light and dark themes. It uses Google Chrome on macOS and Playwright Chromium elsewhere. On a Mac without Chrome, select the downloaded Chromium browser with:

```sh
PLAYWRIGHT_CHANNEL=chromium npx tsx scripts/verify.ts local/my-flow.html
```

Also inspect the diagram, code and transitions yourself. Automated checks can find layout problems, but they cannot establish that an explanation is correct. Authored scenes and simulations do not execute or verify the application code they describe.

## Develop and test

From the project folder, run:

```sh
npm ci --ignore-scripts
npx playwright install chromium
npm run check
npm test
npm run build
npm run test:browser
npm run check:privacy
```

Browser tests use the same browser selection as the visualization verifier. The strict checks cover TypeScript, lint and formatting. Release checks verify that local work, credentials, build artifacts and Git history stay out of the downloadable toolkit. The development server accepts connections from your own machine; production serving disables local routes.

## Documentation

- [Authoring guide](docs/AUTHORING.md)
- [Code standards](docs/CODE-QUALITY.md)
- [Testing guide](docs/TESTING.md)
- [Deployment guide](docs/DEPLOYMENT.md)
- [Delivery checklist](docs/PLAN.md)

## License

Motion Lab's original code is available under the [MIT License](LICENSE). Keep its copyright and license notices when redistributing it. Third-party components retain their own notices in the source, hosted application, standalone lessons and downloadable toolkit. See [licensing and third-party sources](docs/LICENSING.md) for details.
