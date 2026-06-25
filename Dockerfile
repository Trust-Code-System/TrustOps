# Render builds the BACKGROUND WORKER from this Dockerfile (see render.yaml).
# The Next.js web app is deployed on Vercel (which ignores this file). A
# Dockerfile gives a deterministic, host-agnostic build (node:20-slim -> npm 10),
# which is also why package-lock.json is generated against that npm version.
#
# Required env vars on the Render worker service:
#   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
# Optional (real messaging/AI from the worker):
#   ANTHROPIC_API_KEY, RESEND_API_KEY, EMAIL_FROM, WHATSAPP_TOKEN, WHATSAPP_PHONE_ID

FROM node:20-slim
WORKDIR /app

# Install deps first (cached). tsx is a runtime dependency, so a plain install
# includes it — no build step, the worker runs the TS entrypoint via tsx.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

CMD ["npm", "run", "worker:prod"]
