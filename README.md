# StepSecurity Maintained `pr-labeler` Action

Forked from [TimonVS/pr-labeler-action](https://github.com/TimonVS/pr-labeler-action)

A GitHub Action that automatically applies labels to your PRs based on branch name patterns like `feature/*` or `fix/*`.
Can be used in combination with [Release Drafter](https://github.com/toolmantim/release-drafter) to automatically [categorize pull requests](https://github.com/toolmantim/release-drafter#categorize-pull-requests).

## Usage

Add `.github/workflows/pr-labeler.yml` with the following:

```yml
name: PR Labeler
on:
  pull_request:
    types: [opened]

permissions:
  contents: read

jobs:
  pr-labeler:
    permissions:
      contents: read
      pull-requests: write
    runs-on: ubuntu-latest
    steps:
      - uses: step-security/pr-labeler-action@v4
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
          configuration-path: .github/pr-labeler.yml # optional, .github/pr-labeler.yml is the default value
```

## Configuration

Configure by creating a `.github/pr-labeler.yml` file.

For example:

```yml
feature: ['feature/*', 'feat/*']
fix: fix/*
chore :hammer:: chore/*
```

Then if a pull request is opened with the branch name `feature/218-add-emoji-support` the Action will automatically apply the `feature` label.

Similarly, if a pull requests is opened with the branch name `fix/weird-bug` or `chore/annual-refactoring-job`, the Action will apply the `fix` or `chore 🔨` label, respectively.

If the label does not exist in your repo, a new one will be created (with no color and blank description), but it will not be permanently saved to the `github.com/<your_repo>/labels` page.

### Wildcard branches in configuration

You can use `*` as a wildcard for matching multiple branch names. See https://www.npmjs.com/package/matcher for more information about wildcard options.

### Default configuration

When no configuration is provided, the following defaults will be used:

```yml
feature: ['feature/*', 'feat/*']
fix: 'fix/*'
chore: 'chore/*'
```
