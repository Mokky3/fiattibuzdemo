# Build stage: clone and build OHIF Viewer
FROM node:20-alpine AS build

RUN apk add --no-cache git

# Clone OHIF repo
RUN git clone https://github.com/OHIF/Viewers.git /app
WORKDIR /app/platform/app

# Install dependencies
RUN yarn install

# Copy our PACS config into the public/config directory (OHIF webpack expects it here)
# Create the directory first, then copy the file
RUN mkdir -p ./public/config
COPY app-config.js ./public/config/app-config.js

# Verify the config file was copied correctly and show directory structure
RUN echo "=== Verifying config file ===" && \
    ls -la ./public/config/ && \
    cat ./public/config/app-config.js && \
    echo "=== Config file verified ===" || \
    (echo "ERROR: Config file not found!" && exit 1)

# Build OHIF (static files) with our custom config
# APP_CONFIG is relative to PUBLIC_DIR (public/), so config/app-config.js becomes public/config/app-config.js
# PUBLIC_URL is root for Cloud Run
RUN APP_CONFIG=config/app-config.js PUBLIC_URL=/ NODE_ENV=production yarn run build

# Runtime stage: serve with nginx
FROM nginx:alpine

# Copy built OHIF into nginx html folder
COPY --from=build /app/platform/app/dist /usr/share/nginx/html

# Simple nginx config for a SPA
RUN printf 'server {\n\
    listen 8080;\n\
    server_name _;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]

