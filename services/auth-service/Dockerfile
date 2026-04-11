# FROM node:22-alpine

# # Create app directory
# WORKDIR /usr/src/app

# # Install app dependencies
# # A wildcard is used to ensure both package.json AND package-lock.json are copied
# COPY package*.json ./

# RUN npm install

# # Bundle app source
# COPY . .

# # Expose port
# EXPOSE 3000

# # Start the application using tsx locally
# CMD [ "npm", "run", "dev" ]

# Step 1: Build Stage
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# Copy only the package files first (better caching)
COPY package*.json ./
RUN npm install

# Copy the rest of your code
COPY . .

# If you use TypeScript, run your build command here
# RUN npm run build 

# Step 2: Runtime Stage (The "Slim" version)
FROM node:20-alpine
WORKDIR /usr/src/app

# Only copy the production dependencies and built code
COPY --from=builder /usr/src/app/package*.json ./
RUN npm install --only=production
COPY --from=builder /usr/src/app ./

# The port your Auth service listens on
EXPOSE 3000

CMD ["node", "src/index.js"]

