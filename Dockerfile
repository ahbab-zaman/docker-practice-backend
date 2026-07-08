# =========================================
# STAGE 1: "Builder" — compiles TypeScript into plain JavaScript
# =========================================

# Start from a small Node.js 20 image (alpine = a lightweight Linux distro)
FROM node:20-alpine AS builder

# Set the working directory inside the container.
# All following commands run from here, like doing "cd /app" first.
WORKDIR /app

# Copy ONLY package.json and package-lock.json first (not the whole project yet).
# This is a caching trick: if these files don't change, Docker reuses the
# already-installed node_modules instead of reinstalling every time you rebuild.
COPY package*.json ./

# Install ALL dependencies, including dev dependencies (like typescript).
# We need dev deps here because this stage's whole job is to compile TS -> JS.
RUN npm install

# Now copy the rest of your project files (src/, tsconfig.json, etc.)
COPY . .

# Run your build script (tsc, or tsc && tsc-alias) — this creates the dist/ folder
RUN npm run build


# =========================================
# STAGE 2: "Runtime" — the actual image that runs your app
# =========================================

# Start completely fresh from the same small base image.
# We do NOT reuse Stage 1's files — this keeps the final image small,
# since none of the TypeScript source or dev tools get carried over.
FROM node:20-alpine

# Same working directory as before
WORKDIR /app

# Again, copy only package files first (for the same caching reason)
COPY package*.json ./

# This time, install ONLY production dependencies (skip devDependencies
# like typescript, ts-node-dev — we don't need them to just RUN the app)
RUN npm install --omit=dev

# Copy the compiled JavaScript (dist/) from Stage 1 into this final image.
# This is the only thing we actually need from the builder stage.
COPY --from=builder /app/dist ./dist

# Create a non-root user to run the app as (security best practice —
# by default containers run as "root", which is more privileged than needed)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Tell Docker which port this container listens on.
# This is documentation for humans/tools — it does NOT actually publish
# the port. That happens later with "docker run -p 4000:4000"
EXPOSE 4000

# The actual command that runs when the container starts.
# This is the containerized equivalent of running "node dist/server.js" yourself.
CMD ["node", "dist/server.js"]