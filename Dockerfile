# Railway builds the BACKGROUND WORKER from this Dockerfile. The Next.js web app
# is deployed on Vercel (which ignores this file). A Dockerfile is deterministic
# across Railway's builders, so it sidesteps the Nixpacks/Railpack guesswork.
#
# Required env vars on the Railway service:
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
