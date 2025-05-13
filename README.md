# TemplateBot

A GitHub App that listens for changes on template repositories and propagates those changes to repositories that use the templates.

## How It Works

1. TemplateBot tracks which repositories were created from template repositories using GitHub repository topics.
2. When changes are pushed to a template repository, TemplateBot identifies all repositories using that template.
3. For each repository using the template, TemplateBot:
   - Creates a new branch
   - Applies the template changes to that branch
   - Opens a Pull Request for review

## Features

- Automatically detects when repositories are created from templates
- Tracks template-repository relationships using GitHub repository topics
- Propagates changes from templates to derived repositories
- Creates PRs for review rather than direct commits
- Handles multiple repositories derived from the same template

## Setup

### Prerequisites

- Node.js 16 or later
- A GitHub account with permission to create GitHub Apps

### Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Copy the `.env.example` file to `.env` and fill in the required GitHub App credentials:
   ```
   cp .env.example .env
   ```

### Creating the GitHub App

1. Create a new GitHub App at: https://github.com/settings/apps/new
2. Set the following permissions:
   - Repository contents: Read & write
   - Repository metadata: Read-only
   - Pull requests: Read & write
   - Topics: Read & write
3. Subscribe to the following events:
   - `push`
   - `repository`
4. Generate a private key and download it
5. Update your `.env` file with:
   - `APP_ID`: Your GitHub App ID
   - `PRIVATE_KEY`: The contents of the downloaded private key (replace newlines with `\n`)
   - `WEBHOOK_SECRET`: A secure random string

### Running the App

For development:
```
npm run dev
```

For production:
```
npm start
```

## Development

### Project Structure

- `src/app.js`: Main application logic and webhook event handling
- `lib/template-manager.js`: Manages template-repository relationships
- `lib/repo-updater.js`: Handles propagating changes and creating PRs
- `index.js`: Entry point that initializes the GitHub App

## License

[ISC License](LICENSE)