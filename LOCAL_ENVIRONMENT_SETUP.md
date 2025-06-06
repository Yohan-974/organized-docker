# How to run Organized local environment – dependencies, backend, and frontend.

**We also have a [video version of this guide](https://www.youtube.com/watch?v=duw2TPJg0wY) which covers the previous Firebase-based setup. An updated video is planned.**

Hello everyone! Thank you so much for your support in developing the Organized application. In this guide, we will guide you through the steps to set up the local environment to run the application locally. This guide covers many steps, but by following along, you'll successfully set up everything and will be ready to start coding.

The application now uses a new dedicated backend service for authentication, located in the `auth-backend` directory, which uses PostgreSQL.

## Part 1: Dependencies

Let's start by looking at what you need to set up the environment. We'll begin completely from scratch to make it easy to understand how to install all the necessary dependencies.

### Install Git

_The first dependency is Git, our version control system. You can download it from [git-scm.com](https://git-scm.com/download)._

1. Visit the Git website and select the version suitable for your operating system. For this guide, we'll demonstrate on Windows, but you can adapt the instructions for your OS.
2. Now, download Git. Once the download is finished, we’re ready to install it.

_Now, let’s proceed with the installation of Git._

1. Navigate to the folder location and begin the installation process.
2. Please wait while the installation completes.
3. Excellent, Git is now installed.

### Install Node.js

_There are two valid options for installing Node.js on your system. You can either use an application called [Node Version Manager for Windows (NVM)](https://github.com/coreybutler/nvm-windows), or directly [download Node.js](https://nodejs.org/en), especially if you’re using Linux or macOS. Both methods are acceptable, so you can choose the one that suits you best._

1. Download the NVM (or Node.js directly).
2. Install it using all the default options for the installation.

### Install Node Version Manager (if using NVM)

1. Before installing, let’s check the current Long Term Support (LTS), version of Node.js on the [official Node.js website](https://nodejs.org/en). As of writing, the LTS version is `20.x.x` or higher. Please use the version specified in the `engines` field in `package.json`.
2. Back in the Command Prompt, type `nvm install [version_from_package.json]` to start downloading that version of Node.js. We will also install npm, the package manager for Node.js.
3. After installation, open Command Prompt and type `nvm use [version_from_package.json]` to use the installed version. Make sure you have admin privileges for setup.

And that’s it! Node.js is now installed on our computer.

### Install PostgreSQL

_PostgreSQL is required for the new authentication backend (`auth-backend`)._

1.  **Download:** Visit the [official PostgreSQL download page](https://www.postgresql.org/download/) and choose the installer for your operating system.
2.  **Installation:** Follow the installation wizard. During setup, you will be asked to set a password for the default `postgres` superuser. Remember this password, as you'll need it to create databases and users. You can usually accept default settings for other options.
3.  **Alternatively, use Docker:** If you prefer Docker, you can run PostgreSQL in a container. An example `docker-compose.yml` or `docker run` command can be found in many online resources. Search for "run postgresql with docker". This often involves setting `POSTGRES_PASSWORD`, `POSTGRES_USER`, and `POSTGRES_DB` environment variables for the container.

### Install Visual Studio Code

_Next, we’ll move on to our code editor. We use Visual Studio Code, or VS Code, as Integrated Development Environment (IDE), but feel free to use any IDE you’re comfortable with._

1. To download VS Code, visit the [official VS Code website](https://code.visualstudio.com/download) and select the installer that suits your needs.
2. For this guide, we’ll be downloading the System Installer.
3. Let’s install it. Please make sure to check the following "Open with Code" Additional Tasks to make it easier to open folders in the VS Code. But even without doing so, you will be able to open the folders directly from VS Code.
4. Open the VS Code.

_When you open VS Code for the first time, you'll be asked to personalize its appearance. The IDE will also offer helpful coding tips and suggestions. Feel free to check out these options and click "Mark as done" when you're done._

### Install OpenJDK (Optional for `sws2apps-api`)

_Java (OpenJDK) was previously required for Firebase Emulators. If the `sws2apps-api` still utilizes Firebase emulators for services other than Authentication (e.g., Storage, Functions), you might still need it. If `sws2apps-api`'s Firebase emulator usage is minimal or also being phased out, this might become optional._

1. Go to a provider like [Adoptium (Eclipse Temurin)](https://adoptium.net/) or [Oracle's OpenJDK page](https://www.oracle.com/java/technologies/downloads/) and select a version (e.g., LTS version like 17 or 21). Firebase Emulators generally need at least version 11.
2. Download and install OpenJDK.

### Double-check all dependencies

_Now, let’s do a quick check to confirm that everything has been installed correctly._

1. Open a Command Prompt.
2. For Node.js and npm: Type `node -v` to check the Node.js version, and `npm -v` to check the npm version.
3. For PostgreSQL: If you installed it directly, you might have `psql --version`. If using Docker, check your container status: `docker ps`.
4. (If installed) For Java: Type `java --version`. You should see the version you’ve just installed.

_With that, all our major dependencies are now installed._

## Part 2: Backend Setup

The backend now consists of two main parts:
1.  **`auth-backend`**: The new service for user authentication (Node.js, PostgreSQL).
2.  **`sws2apps-api`**: The existing API for data synchronization and other features.

### Clone GitHub projects (if not already done)

1. Create a new folder in your file system to store all Organized projects if you haven't already.
2. Open Git Bash (or Terminal/Command Prompt) in this folder.
3. Clone the main frontend repository which now includes `auth-backend`: `git clone https://github.com/sws2apps/organized-app.git`
4. Clone the `sws2apps-api` repository if you plan to run it locally: `git clone https://github.com/sws2apps/sws2apps-api.git`
5. `cd organized-app` to enter the main project directory for subsequent `auth-backend` setup.

### Install Visual Studio Code extensions

_These extensions are recommended for both backend and frontend development._

1.  **Prettier:** For code formatting.
2.  **ESLint:** For code linting.

### A. Setup `auth-backend` (New Authentication Service)

This service is located in the `auth-backend` directory within the main `organized-app` repository.

1.  **Navigate to `auth-backend`:**
    Open a terminal and navigate to the `auth-backend` directory:
    `cd auth-backend`
2.  **Install Dependencies:**
    Run `npm install` to install the necessary packages.
3.  **Database Setup (PostgreSQL):**
    *   Ensure your PostgreSQL server is running.
    *   Create a new database for the `auth-backend`. You can use `psql` or a GUI tool like pgAdmin.
        Example using `psql`:
        ```sql
        CREATE DATABASE organized_auth;
        -- Optionally, create a dedicated user
        CREATE USER organized_auth_user WITH PASSWORD 'your_secure_password';
        GRANT ALL PRIVILEGES ON DATABASE organized_auth TO organized_auth_user;
        ```
    *   Apply the database schema: The schema is defined in `schema.sql` at the root of the `organized-app` repository. Connect to your newly created database and run the SQL commands from this file.
        Example using `psql`:
        `psql -U organized_auth_user -d organized_auth -f ../schema.sql` (Adjust path to `schema.sql` if necessary from your current directory).
4.  **Environment Variables:**
    *   Create a `.env` file in the `auth-backend` directory by copying `.env.example`:
        `cp .env.example .env`
    *   Update the `.env` file with your specific configurations:
        *   `DATABASE_URL`: Your PostgreSQL connection string.
            Format: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`
            Example: `postgresql://organized_auth_user:your_secure_password@localhost:5432/organized_auth`
        *   `JWT_SECRET`: A long, random, strong string for signing access tokens.
        *   `JWT_REFRESH_SECRET`: A different long, random, strong string for signing refresh tokens.
        *   `PORT`: Port for the auth-backend to run on (e.g., `3001`).
        *   `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID (if testing Google login).
        *   `GOOGLE_CLIENT_SECRET`: Your Google OAuth Client Secret.
        *   `API_BASE_URL`: The base URL of this auth-backend service itself (e.g., `http://localhost:3001`). Used for constructing redirect URIs for OAuth.
        *   `FRONTEND_URL`: The URL of your frontend application (e.g., `http://localhost:4000`). Used for redirecting after OAuth.
        *   `PASSWORD_RESET_TOKEN_SECRET`: A secret for password reset tokens.
        *   `PASSWORD_RESET_TOKEN_EXPIRES_IN`: Expiration time for password reset tokens (e.g., `1h`).
5.  **Running `auth-backend`:**
    *   From the `auth-backend` directory, run:
        `npm run dev`
    *   This will start the authentication server, typically on port 3001 (or as configured in your `.env`).

### B. Setup `sws2apps-api` (Existing Data Sync API)

Follow the setup instructions within the `sws2apps-api` repository for its own dependencies, Firebase setup (if still used for non-auth services like Storage), and environment variables.

**Crucial Note for `sws2apps-api`:**
This API (for data sync, backup, etc.) must be updated or configured to:
1.  **Validate JWTs issued by the new `auth-backend`**. It should no longer rely on Firebase Auth for user authentication for its protected endpoints.
2.  Use the public key corresponding to the `JWT_SECRET` from the `auth-backend` to verify token signatures, or have an endpoint to delegate token introspection to the `auth-backend`.
3.  The user identifiers (UIDs) in the `sws2apps-api` database might need to be mapped or reconciled with the new user IDs generated by the `auth-backend` (which are UUIDs).

**Firebase Project for `sws2apps-api` (if still needed for non-Auth services):**
If `sws2apps-api` still uses Firebase services like Firestore, Storage, or Functions (unrelated to user authentication), you might still need a Firebase project.
1.  **Create Firebase Project:** If needed, create one on the [Firebase Console](https://console.firebase.google.com/).
2.  **Service Account Key:** If `sws2apps-api` interacts with Firebase Admin SDK, generate a private key (JSON file) from Project Settings -> Service Accounts in Firebase. This key would be used by `sws2apps-api` (e.g., via `GOOGLE_CONFIG_BASE64` if that's its mechanism).
3.  **Firebase Emulators (for non-Auth services):** If `sws2apps-api` uses emulators for Firestore, Storage, etc., set them up as per its documentation. The `storage.rules.example` might still be relevant for Storage Emulator.

_The sections on setting up Firebase Authentication providers (Email/Password, Google) in the Firebase Console and using Firebase Auth Emulators for local user authentication are no longer primary for the core login/registration flow, as this is handled by `auth-backend`._

## Part 3: Frontend (`organized-app`)

1. Navigate to the root of the `organized-app` repository (if you are in `auth-backend`, `cd ..`).
2. Install dependencies by typing `npm i`. This might take a while.

### Setup environment variables for frontend

_Now, let’s add the required environment variables for the frontend application._

1. Create an `.env` file in the root of the `organized-app` project by copying the example: `cp .env.example .env`.
2. Update the `.env` file. The key variable for the new authentication system is:
    *   `VITE_AUTH_BACKEND_URL`: The full URL of your running `auth-backend` service (e.g., `http://localhost:3001`).
3.  Remove or comment out old Firebase Authentication variables if they are no longer used directly by the frontend for auth (they might still be present in `.env.example` for other Firebase services like Installations if that part wasn't fully removed from frontend yet):
    *   `VITE_FIREBASE_APIKEY`
    *   `VITE_FIREBASE_AUTHDOMAIN`
    *   `VITE_FIREBASE_PROJECTID`
    *   `VITE_FIREBASE_APPID`
    *(Note: If the app still uses Firebase for non-auth features like feature flags via Firebase Installations, some of these might still be needed for `firebase/app` initialization. The `VITE_FIREBASE_AUTH_EMULATOR_HOST` is definitely not needed for auth anymore).*
4.  (OPTIONAL) **TEST MODE**: By setting `VITE_APP_MODE="TEST"`, you configure the application to run in a test mode, which includes **pre-populated data** and configurations that facilitate testing and demonstration purposes.

_All the dependencies should be installed, and the environment variables ready. We can now start the frontend application._

### Run the frontend app

1. Type `npm run dev` in the root of the `organized-app` project to start the frontend application.
2. The dev server for the frontend application will start, typically on port `4000` or `5173` (Vite's default). Check your terminal output. Let’s open it in the browser.

### Check if API is working

_Good. The frontend app is working. Let’s test a few functions to ensure that the frontend can communicate properly with the new `auth-backend`._

Let’s proceed on this journey as if we were a new user:

1.  The application should direct you to a login page or an initial setup page.
2.  **Registration (if supported via UI, or test directly via API client):** If a sign-up form is available, try creating a new account using an email and password.
3.  **Login:** Use the email/password login form. Enter the credentials of a user created in your `auth-backend` database (or register a new one).
    *   Upon successful login, you should be redirected to the main application area (e.g., Dashboard).
    *   The application should fetch user-specific data.
4.  **Google OAuth (if configured):**
    *   Click the "Sign in with Google" button.
    *   You should be redirected to Google's consent screen.
    *   After authenticating with Google, you should be redirected back to the frontend's OAuth callback URL (e.g., `/oauth-callback`).
    *   The frontend should handle this callback, store tokens, and log you in, redirecting you to the dashboard.
5.  **Accessing Protected Content:** Navigate to areas of the app that require authentication (e.g., user profile) to ensure they are accessible.
6.  **Logout:** Find and use the logout button. You should be logged out and redirected to the login page.

### Congratulations and happy coding!

If you have more questions or face any problems not covered in this guide, head to our GitHub repository Discussions to ask! Your contributions and support for the Organized app are highly appreciated!
