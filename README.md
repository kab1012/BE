# Backend Server with SQLite

This is a simple backend server using Express.js and SQLite database.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:
```
PORT=3000
DB_PATH=./database.sqlite
```

## Running the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Endpoints

- `GET /api/test` - Test endpoint to verify the API is working

## Testing with Postman

1. Open Postman
2. Create a new GET request
3. Enter the URL: `http://localhost:3000/api/test`
4. Send the request
5. You should receive a response: `{ "message": "API is working!" }` 