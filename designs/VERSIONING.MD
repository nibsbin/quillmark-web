# NPM Versioning Strategy - Design Document

## Overview

This strategy automates NPM package versioning through a command-line driven approach, similar to Rust's `cargo release`. A developer executes a single command specifying the version bump type, which handles all release tasks in sequence: running tests, bumping the version in package.json and package-lock.json, creating a git commit, generating a git tag, pushing to the repository, and publishing to the NPM registry. The entire release process happens through one command execution without any manual file editing.

## Command-Based Workflow

The developer initiates releases by running npm scripts defined in package.json that wrap the entire release process. Scripts like `npm run release` (for patch), `npm run release:minor`, and `npm run release:major` execute the full sequence of npm version, git push with tags, and npm publish in a single command. This can be executed locally by an authorized developer or through a CI/CD workflow triggered manually. The command approach provides explicit control over release timing and version increments, with the developer choosing patch, minor, or major based on the changes being released. This mirrors the Rust ecosystem's `cargo release patch --execute` pattern where a single command orchestrates the complete release workflow.

## Execution Flow

When the release script executes, it first validates that tests pass and the working directory is clean. The script then chains three commands: npm version with the specified bump type to update package files atomically and create both a version commit and git tag, followed by `git push --follow-tags` to synchronize the version history with the remote repository, and finally `npm publish` to upload the newly versioned package to the NPM registry. This entire sequence happens through a single npm run command (e.g., `npm run release`) without manual intervention in package.json, with each step depending on the success of the previous one.