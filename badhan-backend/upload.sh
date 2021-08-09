echo "---switching to master---"
git checkout master
echo "---merge test branch---"
git merge test-branch

echo "Enter commit message: "
read -r message
echo "The commit message is: $message"

echo "---generate swagger documentation---"
node doc/swagger.js

echo "---adding changed files to staging---"
git add .

echo "---committing staged files---"
git commit -am "$message"

# push to mahathir backend repo
echo "---pushing master branch to github---"
git push origin master

# push to remote-aniruddha repo
#git push remote-aniruddha master

# push to mahathir heroku app
echo "---pushing master branch to heroku---"
git push heroku-prod master

#gcloud app deploy --stop-previous-version -q

# push to aniruddha heroku app
#git push heroku-deprecated master

echo "---switching back to test branch---"
git checkout test-branch

echo "---checking secret file changes---"
cd ../secrets
bash ./push.sh
