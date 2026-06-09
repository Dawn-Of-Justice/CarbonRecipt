# Deploying Carbon Receipt to Google Cloud Run

Target project: **`promptwars-495213`** · region **`us-central1`**.

Two Cloud Run services:
- `carbon-receipt-api` — FastAPI backend (built from `backend/` via Cloud Build).
- `carbon-receipt-web` — Next.js frontend (Docker image with the API URL baked in).

There are two ways to deploy: the **GitHub Actions workflow** (keyless, repeatable)
or **manual gcloud** (fastest for a one-off demo).

---

## Option A — manual deploy (gcloud)

Authenticate locally, then deploy. The frontend needs the API URL at *build* time
(Next inlines `NEXT_PUBLIC_*`), so deploy the API first.

```bash
gcloud config set project promptwars-495213

# 1) Backend
gcloud run deploy carbon-receipt-api \
  --source backend --region us-central1 --allow-unauthenticated \
  --set-env-vars GOOGLE_CLOUD_PROJECT=promptwars-495213,GOOGLE_CLOUD_LOCATION=us-central1,GEMINI_MODEL=gemini-2.5-flash,USE_FIRESTORE=false

API_URL=$(gcloud run services describe carbon-receipt-api --region us-central1 --format='value(status.url)')

# 2) Frontend (bake the API URL into the build)
gcloud builds submit frontend \
  --tag us-central1-docker.pkg.dev/promptwars-495213/carbon-receipt/web:latest \
  --substitutions _API_URL="$API_URL"   # or use docker build --build-arg locally
gcloud run deploy carbon-receipt-web \
  --image us-central1-docker.pkg.dev/promptwars-495213/carbon-receipt/web:latest \
  --region us-central1 --allow-unauthenticated

WEB_URL=$(gcloud run services describe carbon-receipt-web --region us-central1 --format='value(status.url)')

# 3) Let the browser app's origin through the API's CORS allowlist
gcloud run services update carbon-receipt-api --region us-central1 \
  --update-env-vars FRONTEND_ORIGIN="$WEB_URL"
```

> Building the web image locally instead of Cloud Build:
> `docker build --build-arg NEXT_PUBLIC_API_BASE_URL="$API_URL" -t <image> frontend`

The backend's runtime service account needs **Vertex AI User**
(`roles/aiplatform.user`) so Gemini calls work in production. With
`USE_FIRESTORE=true`, also grant **Cloud Datastore User**.

---

## Option B — GitHub Actions (`.github/workflows/deploy.yml`)

Triggered manually (Actions → *Deploy to Cloud Run* → *Run workflow*). It deploys
the API, bakes the API URL into the web image, deploys the web, and updates the
API's CORS. Uses **Workload Identity Federation** — no long-lived JSON keys.

### One-time setup

```bash
PROJECT=promptwars-495213
PROJECT_NUM=$(gcloud projects describe $PROJECT --format='value(projectNumber)')

# Enable the APIs the deploy uses.
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com iamcredentials.googleapis.com \
  aiplatform.googleapis.com --project $PROJECT

# Artifact Registry repo for the web image.
gcloud artifacts repositories create carbon-receipt \
  --repository-format=docker --location=us-central1 --project $PROJECT

# Deployer service account + roles.
gcloud iam service-accounts create gh-deployer --project $PROJECT
SA=gh-deployer@$PROJECT.iam.gserviceaccount.com
for ROLE in roles/run.admin roles/cloudbuild.builds.editor \
            roles/artifactregistry.writer roles/iam.serviceAccountUser \
            roles/storage.admin; do
  gcloud projects add-iam-policy-binding $PROJECT --member="serviceAccount:$SA" --role="$ROLE"
done

# Workload Identity Federation pool + provider for this GitHub repo.
gcloud iam workload-identity-pools create github --location=global --project $PROJECT
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --location=global --workload-identity-pool=github \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='Dawn-Of-Justice/CarbonRecipt'" \
  --project $PROJECT

# Let the GitHub repo impersonate the deployer SA.
gcloud iam service-accounts add-iam-policy-binding $SA --project $PROJECT \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUM/locations/global/workloadIdentityPools/github/attribute.repository/Dawn-Of-Justice/CarbonRecipt"
```

### Repository secrets (Settings → Secrets and variables → Actions)

| Secret | Value |
|--------|-------|
| `GCP_WIF_PROVIDER` | `projects/<PROJECT_NUM>/locations/global/workloadIdentityPools/github/providers/github-provider` |
| `GCP_DEPLOY_SA` | `gh-deployer@promptwars-495213.iam.gserviceaccount.com` |

Then run the workflow; the run summary prints the live API and Web URLs.
