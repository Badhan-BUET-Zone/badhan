git checkout master
git merge test-branch
@echo off "git upload "
set /p message="Enter commit message: "
git add .
git commit -am "%message%"
git push origin master
gcloud app deploy
git checkout test-branch
