## Branch Name Convention
  * Always create a branch in the format `yourname/#issuenumber/featurename` For example, `sanju/#34/implement-typescript` .
  * You are NOT ALLOWED to modify the `production` or `development` branch of this repo without permission from Mahathir.
  * You must create a pull request with a base branch and a branch following the above naming for your code to be merged.
  * You are NOT ALLOWED to merge any pull request without permission from Mahathir.
  * While creating a new branch or a pull request,
    * Use `development` as the base branch. It is the branch the development environment deploys from; `production` is release-only.
    * The two branch names are the two environment names, and nothing else deploys — see [Branches and environments](../../README.md#branches-and-environments).

> These branches were called `main` (previously `master`) and `test-branch` until the
> environment-vocabulary rename. The separate `badhan-web` and `badhan-backend`
> repositories this convention was originally written for are now folded into this
> monorepo; their own branch names are historical.
## Commit Message Convention
  * For commit messages, follow this format: `yourname/#issuenumber/brief commit description`
