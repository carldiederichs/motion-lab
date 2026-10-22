# Motion Lab

[Explore the live demo](https://motion-lab-dev.vercel.app/) on desktop or mobile.

Interactive explanations for the engineering question in front of you. Follow a request, step through an algorithm, inspect a state change or compare two designs. Change the inputs and watch the explanation respond. Portable code examples offer TypeScript, JavaScript, Python, Java and C++.

The public site is a static collection of examples. New explanations are created locally by your own AI coding assistant using the included skill. There is no hosted chatbot, model billing, account system or analytics.

## Run locally

Requires Node.js 22.13 or newer. Clone the repository and start the local server:

```sh
git clone https://github.com/carldiederichs/motion-lab.git
cd motion-lab
npm ci --ignore-scripts
npm run dev
```

Alternatively, [download the toolkit ZIP](https://motion-lab-dev.vercel.app/downloads/motion-lab-toolkit.zip), unzip it and run the same commands from `npm ci` onward in its `motion-lab` folder.

Open **http://127.0.0.1:4173**. Explore on desktop or mobile. Creating new explanations with your coding assistant requires a desktop environment.

Open your file-capable coding assistant in this folder. Describe your own code, system or engineering question; the examples are starting points, not the limits of the tool.

In Codex, select Motion Lab from the `/` skill menu, or type:

```text
$motion-lab Explain [my code, system or engineering question] visually. Show what moves, what changes and why. Include a contrasting case.
```

Replace the bracketed text with your question. For example: “Why can a retry create duplicate records, and how would an idempotency key prevent that?”

If your assistant does not discover repository skills, ask it to read the file explicitly:

```text
Read .agents/skills/motion-lab/SKILL.md and use it to create a visual explanation of [my engineering question]. Build it, verify it and show me the local result.
```

Use your own assistant and model with file access and the ability to run the builder. The website does not connect to a model. Local operation does not imply an offline model: your assistant may send context to its provider under its own settings.

## Make an explanation

```sh
npx tsx scripts/cli.ts new my-flow --template request-sequence
# Edit local/my-flow.json, or ask your assistant to edit it.
npx tsx scripts/cli.ts validate local/my-flow.json
npx tsx scripts/cli.ts build local/my-flow.json
```

Open the generated HTML directly, or visit `/local/my-flow.html` on the local dev server. The JSON describes actors, connections, chapter explanations and changes over time. It does not execute arbitrary code. For a different diagram family, choose an example from `examples/catalogue.json` and consult [the authoring guide](docs/AUTHORING.md).

Before sharing, install a browser for verification and check the result:

```sh
npx playwright install chromium
npx tsx scripts/verify.ts local/my-flow.html
```

The verifier checks the player in both themes. Also inspect the actual diagram, code and transitions; automated geometry checks cannot establish that an explanation is correct.

## Develop and test

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run build
npm run test:browser
npm run check:privacy
```

Browser tests use installed Google Chrome on macOS and Playwright Chromium elsewhere. Set `PLAYWRIGHT_CHANNEL=chromium` to use the downloaded browser explicitly. See [code standards](docs/CODE-QUALITY.md), [testing](docs/TESTING.md), [deployment](docs/DEPLOYMENT.md) and [the delivery checklist](docs/PLAN.md).

`local/`, credentials, build artifacts and Git history never enter the toolkit archive. The public build reads only the explicit example catalogue, player and site assets. The local server binds to loopback; production serving disables local routes.

The generation preview on the public page is labelled as a scripted demonstration. The examples use deterministic simulations or authored scenarios. They are explanatory models, not evidence that arbitrary application code has been executed or verified.

## License

[MIT](LICENSE). You can use, modify and distribute the toolkit under this license. The diagram design adaptation retains its notice in `docs/THIRD-PARTY-LICENSE.txt`; the GitHub mark from Primer Octicons retains its notice in `docs/OCTICONS-LICENSE.txt`.
