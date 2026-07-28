# 🐕 Storm Tracker — Backend

> **Une API pour suivre les balades de vos chiens** — Un backend Node.js/Express avec PostgreSQL et MongoDB pour gérer les chiens, les humains et les balades.

---

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-5.2.1-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-8.20.0-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Mongoose](https://img.shields.io/badge/Mongoose-9.1.4-880000?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongoosejs.com/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

---

## 📜 À propos du projet

**Storm Tracker Backend** est une **API RESTful** conçue pour suivre et gérer les balades de chiens. Elle permet de :

- **Gérer les chiens** avec leurs caractéristiques
- **Enregistrer les humains** (propriétaires, promeneurs)
- **Suivre les balades** avec dates, durées et distances
- **Associer** chiens et humains aux balades
- **Stocker les données** dans PostgreSQL et MongoDB


---

## 🔧 Stack Technique

| Catégorie | Technologie | Version | Rôle |
|----------|-------------|---------|------|
| **Runtime** | [Node.js](https://nodejs.org/) | 18+ | Environnement d'exécution |
| **Framework** | [Express.js](https://expressjs.com/) | 5.2.1 | Framework web |
| **Base de données SQL** | [PostgreSQL](https://www.postgresql.org/) | 8.20.0 | Base de données relationnelle |
| **Base de données NoSQL** | [MongoDB](https://www.mongodb.com/) | Atlas | Base de données flexible |
| **ODM** | [Mongoose](https://mongoosejs.com/) | 9.1.4 | Modélisation MongoDB |
| **CORS** | [cors](https://www.npmjs.com/package/cors) | 2.8.5 | Middleware CORS |
| **Validation** | [express-validator](https://express-validator.github.io/docs/) | 7.3.2 | Validation des requêtes |
| **Logging** | [morgan](https://www.npmjs.com/package/morgan) | 1.10.1 | Logger HTTP |
| **Environnement** | [dotenv](https://www.npmjs.com/package/dotenv) | 17.4.2 | Gestion des variables d'environnement |
| **Déploiement** | [Vercel](https://vercel.com/) | - | Hébergement serverless |

---

## ✨ Fonctionnalités

### 🐕 **Gestion des Chiens**
-  **Création** – Ajout d'un nouveau chien avec nom, race, âge
-  **Lecture** – Récupération d'un chien ou de tous les chiens
-  **Mise à jour** – Modification des informations d'un chien
-  **Suppression** – Retrait d'un chien de la base
-  **Filtrage** – Recherche par race, âge, propriétaire

### 👤 **Gestion des Humains**
-  **Création** – Ajout d'une nouvelle personne
-  **Lecture** – Récupération d'une personne ou de toutes
-  **Mise à jour** – Modification des informations
-  **Suppression** – Retrait d'une personne


### 🚶 **Gestion des Balades**
-  **Création** – Enregistrement d'une nouvelle balade
-  **Lecture** – Récupération des balades avec filtres
-  **Mise à jour** – Modification des détails d'une balade
-  **Suppression** – Retrait d'une balade
-  **Associations** – Lier chiens et humains aux balades


### 🗄️ **Double Stockage**
-  **PostgreSQL** – Pour les données structurées (relations) => apprentissage du SQL
-  **MongoDB** – Pour les données flexibles et évolutives
-  **Synchronisation** – Possibilité de synchroniser les deux bases

### 🔒 **Sécurité**
-  **Validation des données** – express-validator pour des données propres
-  **Protection CORS** – Configuration sécurisée
-  **Middleware** – Gestion centralisée des erreurs

---

## 🚀 Installation

### Prérequis
- [Node.js](https://nodejs.org/) (version 18 ou supérieure)
- [Yarn](https://yarnpkg.com/) ou [npm](https://www.npmjs.com/)
- [PostgreSQL](https://www.postgresql.org/) (instance locale ou distante)
- [MongoDB Atlas](https://www.mongodb.com/atlas) (ou instance locale)

### Étapes

1. **Cloner le dépôt**
   ```bash
   git clone https://github.com/dankysten/storm-tracker-backend.git
   cd storm-tracker-backend
   ```

2. **Installer les dépendances**
   ```bash
   yarn install
   # ou
   npm install
   ```

3. **Configurer l'environnement**
   Créer un fichier `.env` à la racine avec les variables suivantes :
   ```env
   # PostgreSQL
   DB_CONNECTION_STRING=postgresql://<user>:<password>@localhost:5432/stormtracker
   # ou
   DB_USER=<user>
   DB_HOST=localhost
   DB_NAME=stormtracker
   DB_PASSWORD=<password>
   DB_PORT=5432
   
   # MongoDB
   MONGO_URI=mongodb+srv://<user>:<password>@cluster0.XXXXXXX.mongodb.net/stormtracker
   
   PORT=3000
   ```

4. **Lancer le serveur**
   ```bash
   # Mode développement
   yarn dev
   # ou
   npm run dev
   
   # Mode production
   yarn start
   # ou
   npm start
   ```

5. **Accéder à l'API**
   ```
   🚀 Serveur lancé sur le port 3000
   🐕 Bienvenue sur l'API Storm Tracker !
   ```
   L'API sera disponible à l'URL : `http://localhost:3000`

---

## 📡 Endpoints API

### 🔹 **Base URL**
```
http://localhost:3000
```

### 🔹 **Chiens (Dogs)**
| Méthode | Endpoint | Description | Authentification |
|---------|----------|-------------|------------------|
| GET | `/dogs` | Récupère tous les chiens | ❌ Non |
| GET | `/dogs/:id` | Récupère un chien spécifique | ❌ Non |
| POST | `/dogs` | Crée un nouveau chien | ❌ Non |
| PUT | `/dogs/:id` | Met à jour un chien | ❌ Non |
| DELETE | `/dogs/:id` | Supprime un chien | ❌ Non |

### 🔹 **Humains (Humans)**
| Méthode | Endpoint | Description | Authentification |
|---------|----------|-------------|------------------|
| GET | `/humans` | Récupère tous les humains | ❌ Non |
| GET | `/humans/:id` | Récupère un humain spécifique | ❌ Non |
| POST | `/humans` | Crée un nouvel humain | ❌ Non |
| PUT | `/humans/:id` | Met à jour un humain | ❌ Non |
| DELETE | `/humans/:id` | Supprime un humain | ❌ Non |

### 🔹 **Balades (Walks)**
| Méthode | Endpoint | Description | Authentification |
|---------|----------|-------------|------------------|
| GET | `/walks` | Récupère toutes les balades | ❌ Non |
| GET | `/walks/:id` | Récupère une balade spécifique | ❌ Non |
| POST | `/walks` | Crée une nouvelle balade | ❌ Non |
| PUT | `/walks/:id` | Met à jour une balade | ❌ Non |
| DELETE | `/walks/:id` | Supprime une balade | ❌ Non |

---

## 📁 Structure du Projet

```
storm-tracker-backend/
├── app.js                    # Point d'entrée et configuration Express
├── package.json             # Dépendances et scripts
├── vercel.json              # Configuration Vercel
├── .env                     # Variables d'environnement
├── .gitignore               # Fichiers ignorés par Git
│
├── db.js                    # Configuration PostgreSQL
│
├── routes/
│   ├── dogs_sql.js          # Routes chiens (PostgreSQL)
│   ├── humans_sql.js        # Routes humains (PostgreSQL)
│   └── walks_sql.js         # Routes balades (PostgreSQL)
│
└── node_modules/            # Dépendances installées
```

---

## 🛡️ Configuration de Déploiement (Vercel)

Le projet est configuré pour être déployé sur **Vercel** avec :
- Runtime : Node.js
- Serverless Functions : Activées
- Configuration automatique via `vercel.json`

**Pour déployer :**
1. Pousser le code sur un dépôt GitHub
2. Importer le projet sur Vercel
3. Configurer les **Environment Variables** :
   - `DB_CONNECTION_STRING` ou `DB_USER`, `DB_HOST`, `DB_NAME`, `DB_PASSWORD`, `DB_PORT`
   - `MONGO_URI` (optionnel si vous utilisez aussi MongoDB)
4. Déployer !

---

## 📝 Exemples de Requêtes

###  Créer un chien
```bash
curl -X POST http://localhost:3000/dogs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rex",
    "breed": "Labrador",
    "age": 3,
    "ownerId": "12345"
  }'
```

###  Créer un humain
```bash
curl -X POST http://localhost:3000/humans \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jean Dupont",
    "email": "jean@dupont.com",
    "role": "owner"
  }'
```

###  Créer une balade
```bash
curl -X POST http://localhost:3000/walks \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2024-07-28",
    "duration": 60,
    "distance": 5.2,
    "dogId": "12345",
    "humanId": "67890"
  }'
```

###  Récupérer toutes les balades
```bash
curl -X GET http://localhost:3000/walks
```

---

## 🗄️ Schéma de la Base de Données

### PostgreSQL

#### Dogs
```sql
CREATE TABLE dogs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  breed VARCHAR(100),
  age INTEGER,
  owner_id INTEGER REFERENCES humans(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Humans
```sql
CREATE TABLE humans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE,
  role VARCHAR(50) DEFAULT 'walker',
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Walks
```sql
CREATE TABLE walks (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  duration INTEGER, -- en minutes
  distance DECIMAL(10,2), -- en km
  dog_id INTEGER REFERENCES dogs(id),
  human_id INTEGER REFERENCES humans(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
- **Ouvrir une issue** pour signaler un bug ou proposer une amélioration
- **Forker le projet** et soumettre une Pull Request

---

## 📜 Licence

Ce projet est sous licence **[MIT](https://opensource.org/licenses/MIT)**.

---

## 👤 Auteur

📌 **Romain Authier**  
📧 [dankysten](https://github.com/dankysten)  
💼 Développeur Fullstack junior (et papa de Storm 🐕)

---

> *"Un chien, c'est la vie. Plusieurs chiens, c'est une aventure."* ✨
