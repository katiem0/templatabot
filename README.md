# TemplataBot

A GitHub App that listens for changes on template repositories and propagates those changes to repositories that use the templates.

## How It Works

1. TemplataBot tracks which repositories were created from template repositories using a GitHub repository custom property (default: `template-repo`).
2. When changes are pushed to the default branch of a template repository, TemplataBot identifies all repositories in the same organization that have this custom property set to the template's name.
3. For each repository using the template, TemplataBot:
   - Creates a new branch
   - Applies the template changes to that branch
   - Opens a Pull Request for review

## Features

- Automatically detects when repositories are created from templates (and can register them if the custom property is defined in the organization).
- Tracks template-repository relationships using GitHub repository custom properties.
- Propagates changes from templates to derived repositories.
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
2. Set the following **Repository permissions**:
   - Contents: Read & write (to read template files, create branches, and commit changes)
   - Metadata: Read-only (to access repository information)
   - Pull requests: Read & write (to create pull requests)
   - **Custom properties**: Read & write (to read and set the template tracking property)
3. Set the following **Organization permissions**:
   - **Custom properties**: Read-only (to check if the custom property definition exists)
4. Subscribe to the following events:
   - `push`
   - `repository` (for the `created` event)
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

### Deploying with Docker

You can build and run TemplataBot using Docker:

1.  **Build the Docker image:**
    ```sh
    docker build -t templatabot .
    ```

2.  **Run the Docker container:**
    Make sure to pass your environment variables from your `.env` file to the container.
    ```sh
    docker run -d --env-file .env -p 3000:3000 --name templatabot templatabot
    ```
    This will run the app in detached mode on port 3000.

## Development

### Project Structure

- `src/app.js`: Main application logic and webhook event handling
- `lib/template-manager.js`: Manages template-repository relationships
- `lib/repo-updater.js`: Handles propagating changes and creating PRs
- `index.js`: Entry point that initializes the GitHub App

## License

[ISC License](LICENSE)