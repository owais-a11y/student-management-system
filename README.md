# Student Information Management System
### Three-Tier Cloud Architecture: Netlify + Render + MongoDB Atlas

```
Browser -> Netlify (Frontend) -> Render (Node/Express API) -> MongoDB Atlas (studentDB.students)
```

## Project structure
```
student-management-system/
├── backend/                 # Tier 2 - deploy on Render
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   ├── config/database.js
│   ├── models/Student.js
│   ├── routes/studentRoutes.js
│   └── controllers/studentController.js
├── frontend/                # Tier 1 - deploy on Netlify
│   ├── index.html, style.css, app.js
│   ├── config.js            # holds the Render API URL only
│   └── netlify.toml
└── docs/TESTING.md          # the 5 required test cases
```

## Deployment sequence (follow in order)

### Step 1-2: MongoDB Atlas (Tier 3)
1. Create a free account at mongodb.com/atlas and create a **free (M0) cluster**.
2. **Database Access** -> Add Database User (username + strong password). Give it **Read and write to any database** only (or restrict to `studentDB`).
3. **Network Access** -> Add IP Address. Render's free tier has no fixed IP, so use `0.0.0.0/0` (allow from anywhere) for this exercise. The strong DB password is then your protection.
4. **Database -> Connect -> Drivers** and copy the connection string, e.g.
   `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/`
5. Insert the database name before the `?`:
   `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/studentDB?retryWrites=true&w=majority`
   (The database `studentDB` and collection `students` are created automatically on the first insert. You can also create them manually under Collections.)
   If the password contains special characters (`@ : / ?`), URL-encode them.

### Step 3-4: Run the backend locally (optional but recommended)
```bash
cd backend
npm install
cp .env.example .env        # then edit .env with your real MONGODB_URI
# for local testing set FRONTEND_URL=http://localhost:8080
npm start
```
Open http://localhost:5000/health -> `{"status":"ok"}`.

### Step 5: Deploy backend on Render (Tier 2)
1. Push this project to a **GitHub repository** (`backend/.env` is git-ignored; never commit secrets).
2. Render dashboard -> **New -> Web Service** -> connect the repo.
3. Settings:
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance type:** Free
4. **Environment** tab -> add variables:
   | Key | Value |
   |---|---|
   | `MONGODB_URI` | your Atlas connection string |
   | `FRONTEND_URL` | `http://localhost:8080` for now (update in Step 10) |
   (Render supplies `PORT` automatically; the app reads it.)
5. Deploy. Note your URL, e.g. `https://student-api.onrender.com`.

### Step 6: Test the REST APIs
```bash
API=https://student-api.onrender.com
curl $API/health
curl -X POST $API/api/students -H "Content-Type: application/json" \
  -d '{"studentId":"ST101","name":"Rahul Sharma","email":"rahul@example.com","department":"Computer Science","semester":5,"contact":"9876543210"}'
curl $API/api/students
curl $API/api/students/ST101
curl "$API/api/students?search=rahul"
curl -X PUT $API/api/students/ST101 -H "Content-Type: application/json" -d '{"semester":6}'
curl -X DELETE $API/api/students/ST101
```

### Step 7-8: Point the frontend at the API
Edit `frontend/config.js`:
```js
window.APP_CONFIG = { API_BASE_URL: "https://student-api.onrender.com" };
```
(No trailing slash. No database credentials here, ever.)

### Step 9: Deploy frontend on Netlify (Tier 1)
**Option A - drag and drop:** Netlify -> Add new site -> Deploy manually -> drag the `frontend` folder.
**Option B - Git:** Add new site -> Import from Git -> set **Base directory** `frontend`, **Build command** empty, **Publish directory** `frontend` (or `.` if base is set).
Rename the site under *Site configuration -> Change site name*, e.g. `student-management-system` -> `https://student-management-system.netlify.app`.

### Step 10: Configure CORS and environment variables
In Render -> Environment, set:
```
FRONTEND_URL=https://student-management-system.netlify.app
```
(no trailing slash; comma-separate multiple origins). Save - Render redeploys. Now only your Netlify site can call the API from a browser.

### Step 11: End-to-end testing
Open the Netlify URL and run the test cases in `docs/TESTING.md`, verifying each change in MongoDB Atlas (Database -> Browse Collections -> `studentDB.students`).

## API reference
| Operation | Method | Endpoint | Success |
|---|---|---|---|
| Create | POST | `/api/students` | 201 |
| Read all (+search) | GET | `/api/students?search=term` | 200 |
| Read one | GET | `/api/students/:id` (e.g. `ST101`) | 200 / 404 |
| Update | PUT | `/api/students/:id` | 200 / 404 |
| Delete | DELETE | `/api/students/:id` | 200 / 404 |

Errors: 400 validation, 403 CORS, 404 not found, 409 duplicate Student ID, 500 generic (no internal details leaked).

## Security checklist (implemented)
- HTTPS on Netlify and Render
- DB credentials only in Render env vars; `.env` git-ignored; frontend never talks to MongoDB
- Backend input validation + whitelist of accepted fields + regex-escaped search
- CORS restricted to `FRONTEND_URL`
- `helmet` security headers, 100 kb body limit
- Generic error messages to clients; details only in server logs
- Atlas user with least privilege needed

## Troubleshooting
| Symptom | Fix |
|---|---|
| Frontend shows "Cannot reach the server" | Render free tier was asleep: wait ~60 s and retry; check `config.js` URL |
| Browser console: CORS error | `FRONTEND_URL` on Render must exactly match the Netlify origin (https, no trailing slash) |
| Render logs: `MongoDB connection failed` | Check password encoding, Atlas Network Access (0.0.0.0/0), and the URI |
| 409 on add | Student ID already exists |
