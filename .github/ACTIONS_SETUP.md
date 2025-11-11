# GitHub Actions Setup Guide

This guide explains how to set up the required GitHub secrets for the CI/CD pipeline.

## Required Secrets

### 1. NPM_TOKEN (Required for releases)

This token is needed to publish the adapter to NPM.

**Steps to create:**
1. Go to [npmjs.com](https://npmjs.com) and log in
2. Click your profile picture → "Access Tokens"
3. Click "Generate New Token" → "Classic Token"
4. Select "Automation" type
5. Copy the token

**Add to GitHub:**
1. Go to your repository on GitHub
2. Click "Settings" → "Secrets and variables" → "Actions"
3. Click "New repository secret"
4. Name: `NPM_TOKEN`
5. Value: Paste your NPM token
6. Click "Add secret"

### 2. GITHUB_TOKEN (Automatically provided)

This token is automatically provided by GitHub Actions. No action needed.

## Optional Secrets

### SENTRY_AUTH_TOKEN (Optional - for error tracking)

If you want to use Sentry for error tracking:

1. Create account at [sentry.io](https://sentry.io)
2. Create a new project
3. Go to Settings → Account → API → Auth Tokens
4. Create a new auth token with `project:releases` scope
5. Add to GitHub as `SENTRY_AUTH_TOKEN`
6. Uncomment Sentry configuration in `.github/workflows/test-and-release.yml`

## Workflow Files

### test-and-release.yml
Main workflow that:
- Runs on every push to main branch
- Runs on pull requests
- Runs tests on multiple Node.js versions and operating systems
- Automatically publishes to NPM when a version tag is pushed
- Uses ioBroker testing actions for compatibility

### pr-checks.yml
Runs checks on pull requests:
- Linting
- Unit tests
- Package structure validation

### dependency-updates.yml
Checks for outdated dependencies weekly and creates issues

## Dependabot

Automatically creates PRs for dependency updates:
- NPM packages (monthly)
- GitHub Actions (monthly)

Configure in `.github/dependabot.yml`

## Creating a Release

The workflow uses semantic versioning. To create a release:

### Method 1: Manual Tag (Recommended)
```bash
git tag v1.0.0
git push origin v1.0.0
```

### Method 2: Using semantic-release
Commit messages following conventional commits format will automatically trigger releases:
- `feat:` → Minor version bump
- `fix:` → Patch version bump  
- `BREAKING CHANGE:` → Major version bump

## Testing the Workflow

Before pushing to main:
1. Run tests locally: `npm test`
2. Run linter: `npm run lint`
3. Check package: `npm run test:package`

## Troubleshooting

### Workflow fails with "npm publish failed"
- Check that NPM_TOKEN is correctly set
- Verify you have publish permissions for the package
- Ensure package version is not already published

### Tests fail on Windows/macOS but pass on Linux
- Check file path separators
- Verify cross-platform compatibility
- Review OS-specific test outputs in workflow logs

### Linter fails
- Run `npm run lint:fix` locally
- Commit and push the fixes

## Monitoring

Check workflow status:
- Go to "Actions" tab in your GitHub repository
- View logs for any failed runs
- Fix issues and push updates

## Support

For issues with GitHub Actions, check:
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [ioBroker Testing Actions](https://github.com/ioBroker/testing-action-adapter)
- Open an issue in this repository