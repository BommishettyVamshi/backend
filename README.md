# MERN Screen Recorder - Backend

## Overview
This is the **backend** of the MERN Screen Recorder App. It is built using **Node.js** and **Express.js** and handles:

- Uploading recordings from the frontend.
- Storing recordings in **Supabase Storage**.
- Managing metadata (filename, URL, size, creation date) in **SQLite**.
- Serving uploaded recordings for streaming or download.
- Deleting recordings from both Supabase storage and the database.

The backend provides a simple **REST API** that works seamlessly with the frontend.

## Features
- **Upload Recordings:** Accepts video recordings from the frontend and saves them to Supabase storage.
- **Stream Recordings:** Serves uploaded recordings via public URLs.
- **List Recordings:** Provides metadata of all recordings in reverse chronological order.
- **Delete Recordings:** Deletes recordings from both Supabase storage and the SQLite database.
- **Secure & Simple:** Handles file uploads efficiently and prevents overwriting files using unique timestamps.

## Tech Stack
- **Backend Framework:** Node.js, Express.js
- **Database:** SQLite (for metadata)
- **Storage:** Supabase Storage (for video files)
- **File Uploads:** Multer
- **Environment Variables:** dotenv
- **CORS:** Enabled for frontend URL

## Environment Variables
Create a `.env` file at the root of the backend folder with the following:

```env
SUPABASE_URL=your-supabase-url
SUPABASE_SECRET_KEY=your-supabase-secret-key
PORT=5000


## Project Structure
backend/
├─ server.js          # Main server and routes
├─ database.db        # SQLite database (auto-created)
├─ package.json
├─ .env
├─ README.md
└─ node_modules/

## How to Run Locally
1. Clone the backend repository:
   git clone https://github.com/your-username/backend.git
2. Navigate to the project folder:
    cd backend
3. Navigate to the project folder:
    npm install
4. Create .env with Supabase credentials.
5. Start the server:
    node server.js / npm run dev

## Deployment
The backend is deployed on Render at:
    https://backend-ltn9.onrender.com