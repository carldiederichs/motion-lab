FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY engine ./engine
COPY site ./site
COPY examples ./examples
COPY templates ./templates
COPY scripts ./scripts
COPY tests ./tests
COPY docs ./docs
COPY .agents ./.agents
COPY AGENTS.md README.md LICENSE .gitignore .dockerignore Dockerfile vercel.json railway.json playwright.config.mjs ./
RUN npm run build && npm run check:privacy

FROM node:22-alpine
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/scripts/serve.mjs /app/scripts/renderer.mjs ./scripts/
COPY --from=build /app/package.json ./package.json
USER node
EXPOSE 3000
CMD ["node", "scripts/serve.mjs", "--host", "0.0.0.0"]
