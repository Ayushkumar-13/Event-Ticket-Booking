# Adding Secrets to GitHub for CI/CD Pipeline

To enable the GitHub Actions workflow to deploy your application to Vercel automatically, you need to add your API keys/tokens as **Repository Secrets**. 

Here is a step-by-step guide:

### 1. Go to Your Repository Settings
1. Open your project repository on GitHub.
2. Click on the **Settings** tab located near the top right of the repository menu.

### 2. Navigate to Secrets and Variables
1. In the left sidebar, scroll down to the **Security** section.
2. Click on **Secrets and variables**.
3. Select **Actions**.

### 3. Add the Required Secrets
You will need to add each of the following secrets one by one. 
For each secret:
1. Click the green **New repository secret** button.
2. Enter the **Name** exactly as listed below.
3. Paste the corresponding **Secret** value.
4. Click **Add secret**.

---

### List of Required Secrets

#### General Vercel Secrets
*   **Name:** `VERCEL_TOKEN`
    *   **How to get:** Log into Vercel -> Account Settings -> Tokens -> Create a Personal Access Token.
*   **Name:** `VERCEL_ORG_ID`
    *   **How to get:** This is your Vercel User ID or Team ID. You can find this in Vercel Settings -> General -> scroll down to ID.

#### Backend Deployment (Vercel)
*   **Name:** `VERCEL_PROJECT_ID_BACKEND`
    *   **How to get:** Go to your backend project in Vercel -> Settings -> General -> scroll down to Project ID.

#### Frontend Deployment (Vercel)
*   **Name:** `VERCEL_PROJECT_ID_FRONTEND`
    *   **How to get:** Go to your frontend project in Vercel -> Settings -> General -> scroll down to Project ID.

---

### What Happens Next?
Once these 4 secrets are saved in your repository, every time you `git push` new code to the `main` branch:
1. GitHub Actions will spin up a temporary server.
2. It will install dependencies and run your backend Jest/Supertest suite.
3. If all tests pass with 100% success, it will automatically trigger Vercel to pull the latest backend code and deploy it.
4. It will then trigger Vercel to build and deploy your React frontend.
5. If tests **fail**, the deployment will be aborted to protect production!
