# CI/CD Setup Guide - GitHub Secrets Configuration

## Required GitHub Secrets

To enable the CI workflow, you need to configure the following secrets in your GitHub repository:

### 1. Docker Hub Authentication

#### **DOCKERHUB_USERNAME**
- **Value**: Your Docker Hub username (`jeffreyxu2025`)
- **Description**: Used to authenticate with Docker Hub for pushing images

#### **DOCKERHUB_TOKEN**
- **Value**: Docker Hub access token (not your password)
- **Description**: Secure token for Docker Hub authentication

### 2. GitHub Token (Optional - uses default)

#### **GITHUB_TOKEN**
- **Value**: Automatically provided by GitHub Actions
- **Description**: Used for updating Kubernetes manifests in the repository

## Setup Instructions

### Step 1: Create Docker Hub Access Token

1. **Log in to Docker Hub**
   - Go to https://hub.docker.com
   - Sign in with your credentials

2. **Generate Access Token**
   ```bash
   # Navigate to Account Settings > Security
   # Click "New Access Token"
   # Name: "GitHub Actions CI"
   # Permissions: Read, Write, Delete
   # Copy the generated token (save it securely)
   ```

### Step 2: Configure GitHub Repository Secrets

1. **Navigate to Repository Settings**
   ```
   GitHub Repository → Settings → Secrets and variables → Actions
   ```

2. **Add Repository Secrets**
   ```
   Click "New repository secret" for each:
   
   Name: DOCKERHUB_USERNAME
   Value: jeffreyxu2025
   
   Name: DOCKERHUB_TOKEN  
   Value: [paste your Docker Hub access token]
   ```

### Step 3: Verify Workflow Permissions

1. **Check Actions Permissions**
   ```
   Repository → Settings → Actions → General
   
   Ensure "Allow GitHub Actions to create and approve pull requests" is enabled
   ```

2. **Workflow Permissions**
   ```
   Set to: "Read and write permissions"
   Check: "Allow GitHub Actions to create and approve pull requests"
   ```

## CI Workflow Overview

### What the Workflow Does

```yaml
Trigger: Push to main/develop branches (monopoly/** changes)
├── Test Job
│   ├── Setup Node.js 18
│   ├── Install dependencies (npm ci)
│   ├── Run tests
│   └── Security audit
├── Build Job (if tests pass)
│   ├── Setup Docker Buildx
│   ├── Login to Docker Hub
│   ├── Build multi-arch image (amd64/arm64)
│   └── Push to jeffreyxu2025/monopoly-game-engine
└── Update Manifests Job (main branch only)
    ├── Update K8s manifest with new image tag
    └── Commit changes back to repository
```

### Generated Docker Images

The workflow creates images with these tags:
- `jeffreyxu2025/monopoly-game-engine:latest` (main branch)
- `jeffreyxu2025/monopoly-game-engine:main-<commit-sha>`
- `jeffreyxu2025/monopoly-game-engine:develop` (develop branch)

### Updated Kubernetes Manifests

The workflow automatically updates:
- `monopoly/k8s/game-engine.yaml` with new image tags
- Commits changes back to the repository with `[skip ci]` to avoid loops

## Testing the Setup

### 1. Verify Secrets Configuration
```bash
# Check if secrets are properly configured
# Go to Repository → Settings → Secrets and variables → Actions
# You should see:
# - DOCKERHUB_USERNAME (configured)
# - DOCKERHUB_TOKEN (configured)
```

### 2. Test the Workflow
```bash
# Make a small change to trigger the workflow
echo "# Test change" >> monopoly/game-engine/README.md
git add monopoly/game-engine/README.md
git commit -m "test: Trigger CI workflow"
git push origin main
```

### 3. Monitor Workflow Execution
```bash
# Check workflow status
# Go to Repository → Actions tab
# Look for "Monopoly Game CI" workflow
# Monitor the test, build, and update-manifests jobs
```

### 4. Verify Docker Hub
```bash
# Check if image was pushed successfully
# Go to https://hub.docker.com/r/jeffreyxu2025/monopoly-game-engine
# You should see new tags with timestamps
```

## Troubleshooting

### Common Issues

#### **Docker Hub Authentication Failed**
```bash
Error: Login failed
Solution: 
- Verify DOCKERHUB_USERNAME is correct
- Regenerate DOCKERHUB_TOKEN if needed
- Ensure token has write permissions
```

#### **Manifest Update Failed**
```bash
Error: Permission denied
Solution:
- Check workflow permissions are set to "Read and write"
- Verify GITHUB_TOKEN has proper permissions
```

#### **Build Failed - Platform Issues**
```bash
Error: Multi-platform build failed
Solution:
- Check Dockerfile syntax
- Ensure base image supports both amd64/arm64
```

### Manual Docker Commands (for testing)

```bash
# Test local build
cd monopoly/game-engine
docker build -t jeffreyxu2025/monopoly-game-engine:test .

# Test multi-arch build
docker buildx build --platform linux/amd64,linux/arm64 -t jeffreyxu2025/monopoly-game-engine:test .

# Manual push (after docker login)
docker push jeffreyxu2025/monopoly-game-engine:test
```

## Next Steps

After CI is working:
1. **Add more services** (matchmaking, user-service) to the matrix
2. **Set up CD pipeline** for automated deployment to EKS
3. **Add integration tests** between services
4. **Configure branch protection** rules requiring CI to pass

The CI workflow is now ready to build and push your Monopoly game images automatically!
