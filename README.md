# QuantaSIP Backend

This backend provides an API endpoint to store contact form submissions from the website into a PostgreSQL database.

## Setup

1. Make sure you have Node.js and npm installed.
2. Install dependencies:
   ```
   npm install
   ```
3. Update the PostgreSQL connection details in `server.js` if needed (default: user `postgres`, password `arpit`, db `Arpit`, port `5432`).
4. Ensure your PostgreSQL server is running and the `Test` table exists in the `public` schema with columns:
   - Name (varchar(32))
   - Email (varchar(32))
   - Phone Number (varchar(32))
   - Message (varchar(500))

## Running the Server

```
npm start
```

The server will run on [http://localhost:5000](http://localhost:5000).

## API

### POST `/api/contact`
- Accepts JSON body: `{ name, email, phone, message }`
- Stores the data in the `Test` table. 