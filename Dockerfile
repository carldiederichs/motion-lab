FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY engine ./engine
COPY site ./site
COPY examples ./examples
COPY templates ./templates
COPY scripts ./scripts
COPY tests ./tests
COPY docs ./docs
COPY .agents ./.agents
COPY AGENTS.md README.md LICENSE .gitignore .dockerignore Dockerfile vercel.json railway.json playwright.config.mjs tsconfig.json eslint.config.mjs .prettierrc.json .prettierignore ./
RUN npm run check && npm test && npm run build && npm run check:privacy
RUN npx esbuild scripts/serve.ts --bundle --platform=node --format=esm --outfile=server.mjs

FROM node:22-alpine
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.mjs ./scripts/serve.mjs
USER node
EXPOSE 3000
CMD ["node", "scripts/serve.mjs", "--host", "0.0.0.0"]
