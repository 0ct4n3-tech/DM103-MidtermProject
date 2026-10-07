Requirements: Node.js and Docker with Docker Compose.

First-time setup (run these commands in this BPM_v2 folder):
1. Run "docker compose up -d db" to start MySQL. The FO_db.sql file is imported on first initialization.
2. Run "npm install" to install the backend dependencies.

To start the app:
1. Make sure the database is ready with "docker compose ps".
2. Run "npm start".
3. Open http://localhost:3000 in your browser.

The backend defaults to localhost:3306, user root, password admin, and database food_ordering. Override these with DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, and DB_NAME if using another MySQL server.


misc..
--taskkill /F /IM node.exe
--netstat -ano | findstr:3000