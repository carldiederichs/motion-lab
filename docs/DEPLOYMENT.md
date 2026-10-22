# Deploy Motion Lab

The application is static: no database, API keys, model account or environment secrets are required. Vercel is the shorter setup. Railway runs the included static server in a container.

## Current deployment

Production: **https://motion-lab-alpha-three.vercel.app/**. Vercel is connected to this repository with `main` as the production branch. Push reviewed changes to `main` to trigger a new production build, then run the public smoke check below. The initial deployment passed unauthenticated route checks and a visual/interaction review in Chrome.

## Vercel

1. Sign in to Vercel and choose **Add New → Project**.
2. Connect GitHub and import `carldiederichs/motion-lab`. Grant access only to this repository when possible.
3. Keep the root directory at the repository root. The included `vercel.json` selects **Other**, builds with `npm run build && npm run check:privacy`, and publishes only `dist`.
4. Use Node.js 22 or newer. Leave environment variables empty. Deploy.
5. Open the production URL in a signed-out browser. Check that deployment protection does not require visitors to sign in before sharing the link.
6. Run the smoke check below, then review the tour, a lesson and the toolkit download on the live URL.

The [Vercel build configuration documentation](https://vercel.com/docs/builds/configure-a-build) explains framework selection and the output directory. The steps above are for recreating the deployment; the current project is already connected.

## Railway

1. Sign in to Railway and choose **New Project → Deploy from GitHub repo**. Select `carldiederichs/motion-lab`.
2. Railway uses the root `Dockerfile`. `railway.json` sets `/` as the health check. Leave model and database variables empty.
3. Under the service's networking settings, generate a public domain. The server binds `0.0.0.0` and reads Railway's `PORT`; the container default is 3000.
4. After deployment is healthy, run the smoke check and inspect the public site.

See Railway's [Dockerfile guide](https://docs.railway.com/builds/dockerfiles) and [public networking guide](https://docs.railway.com/networking/public-networking). Account plans and any hosting charges are selected by the account owner.

## Live smoke check

From the repository:

```sh
node scripts/smoke.mjs https://motion-lab-alpha-three.vercel.app
```

This performs read-only requests to the landing page, catalogue, every lesson, assets and toolkit ZIP. It checks that private and unknown routes return 404. It does not fill forms, call a model or send local files.

Open the URL yourself at desktop width. Try the ring button, one tour, category/search filters, a changed lesson input, an edge case, code and complexity panels, and the explicit download. The application is prepared for desktop widths of 1024px and above; phone use is not a supported authoring workflow.

## Before each release

```sh
npm ci --ignore-scripts
npm test
npm run build
npm run check:privacy
npx playwright install chromium
npm run test:browser
node scripts/test-release.mjs --checkout
```

A successful local build is not evidence that a hosting account or public URL exists. Record the deployed URL and smoke result after connecting the selected provider.

## Optional GitHub Actions setup

The complete workflow is prepared in `docs/verify.github-actions.yml`. It is not active: the current GitHub OAuth login lacks permission to upload Actions workflows. This does not prevent Vercel or Railway from deploying the repository.

To enable continuous checks, use GitHub's web editor to create `.github/workflows/verify.yml` with the contents of that file and commit it. Alternatively, authorize the GitHub CLI's `workflow` scope, copy the file to that path and push it. The workflow runs the unit, browser, privacy, archive, fresh-checkout and container smoke checks. Its first GitHub run still needs verification.
