FROM node:22-alpine AS builder
WORKDIR /app

# Instala dependências
COPY package*.json ./
RUN npm ci

# Copia código-fonte
COPY . .

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
