FROM node:20

# Dossier de travail dans le conteneur
WORKDIR /serveur

# Copier seulement les fichiers nécessaires aux dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste du projet
COPY . .

# Compiler le projet 
RUN npm run build

# Exposer le port 
EXPOSE 3000

# Lancer le serveur 
CMD ["npm", "run", "start"]
