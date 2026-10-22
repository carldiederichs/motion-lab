# Motion Lab

[Explore the live demo](https://motion-lab-alpha-three.vercel.app/) in a desktop browser.

Interactive explanations for the engineering question in front of you. Follow a request, step through an algorithm, inspect a state change or compare two designs. Change the inputs and watch the explanation respond.

The public site is a static collection of examples. New explanations are created locally by your own AI coding assistant using the included skill. There is no hosted chatbot, model billing, account system or analytics.

## Run locally

Requires Node.js 22.13 or newer. Download and unzip the toolkit, or clone this repository. In the project folder:

```sh
npm ci --ignore-scripts
npm run dev
```

Open **http://127.0.0.1:4173**. Desktop browsers are the supported target; use a window at least 1024 pixels wide.

Open your coding assistant in this folder and ask:

> Read .agents/skills/motion-lab/SKILL.md. Explain why retries can create duplicate records. Show the broken and safe versions, and let me step through both.

Codex discovers the repository skill under `.agents/skills/`. For an assistant with different discovery conventions, the explicit file-reading prompt above is sufficient. You can use any model capable of reading files and running the builder. Local operation does not imply an offline model: your chosen assistant may send context to its provider under its own settings.

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

Browser tests use installed Google Chrome on macOS and Playwright Chromium elsewhere. Set `PLAYWRIGHT_CHANNEL=chromium` to use the downloaded browser explicitly. See [testing](docs/TESTING.md), [deployment](docs/DEPLOYMENT.md) and [the delivery checklist](docs/PLAN.md).

`local/`, credentials, build artifacts and Git history never enter the toolkit archive. The public build reads only the explicit example catalogue, player and site assets. The local server binds to loopback; production serving disables local routes.

The generation preview on the public page is labelled as a scripted demonstration. The examples use deterministic simulations or authored scenarios. They are explanatory models, not evidence that arbitrary application code has been executed or verified.

## License

MIT. The diagram design adaptation includes its original notice in `docs/THIRD-PARTY-LICENSE.txt`.
