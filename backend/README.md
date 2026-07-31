# Backend

This project contains the FastAPI backend for the Connect app.

## Local setup

1. Create and activate a Python virtual environment:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2. Install dependencies:

```powershell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

3. Create a `.env` file from the example:

```powershell
copy .env.example .env
```

4. Ensure a MongoDB server is available at `MONGO_URL`.

   - If you do not have MongoDB installed locally, you can run one with Docker:

     ```powershell
     docker compose -f docker-compose.yml up -d
     ```

5. Start the backend:

```powershell
python run_backend.py
```

The backend serves the API under `http://127.0.0.1:8000/api`.

## Local backend notes

- The frontend will use `EXPO_PUBLIC_BACKEND_URL` when set.
- In development, the app now defaults to `http://127.0.0.1:8000` if `EXPO_PUBLIC_BACKEND_URL` is not provided.
- The previously configured public preview host does not currently expose `/api` for this repo, so a local backend is required for sign in and most demo functionality.

## Notes

- The frontend is configured to use `EXPO_PUBLIC_BACKEND_URL` if set, otherwise it defaults to the public preview host.
- For local development, set `EXPO_PUBLIC_BACKEND_URL` to `http://127.0.0.1:8000` when running Expo.
