FROM node:22-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

RUN npm install

# Bundle app source
COPY . .

# Expose port
EXPOSE 3005

# Start the application using tsx locally
CMD [ "npm", "run", "dev" ]
