FROM node:22-alpine AS builder
WORKDIR /app

# Instala dependências
COPY package*.json ./
RUN npm ci

# Copia código-fonte
COPY . .

# Argumentos de build para o Vite (necessários para o frontend)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_APP_URL
ARG VITE_STRIPE_PUBLIC_KEY
ARG VITE_VAPID_PUBLIC_KEY
ARG VITE_PUBLIC_POSTHOG_PROJECT_TOKEN
ARG VITE_PUBLIC_POSTHOG_HOST

# Expõe como variáveis de ambiente para o processo de build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_APP_URL=$VITE_APP_URL
ENV VITE_STRIPE_PUBLIC_KEY=$VITE_STRIPE_PUBLIC_KEY
ENV VITE_VAPID_PUBLIC_KEY=$VITE_VAPID_PUBLIC_KEY
ENV VITE_PUBLIC_POSTHOG_PROJECT_TOKEN=$VITE_PUBLIC_POSTHOG_PROJECT_TOKEN
ENV VITE_PUBLIC_POSTHOG_HOST=$VITE_PUBLIC_HOST

# Faz o build do Frontend (Vite) e Backend (tsc)
RUN npm run build

# Imagem final de produção
FROM node:22-alpine
WORKDIR /app

# Copia apenas o necessário do builder
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server

# Define variáveis de ambiente esperadas
ENV NODE_ENV=production
ENV PORT=3000

# Expõe porta
EXPOSE 3000

# Executa o servidor compilado
CMD ["npm", "start"]
