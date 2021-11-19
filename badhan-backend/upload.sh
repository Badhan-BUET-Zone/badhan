echo "---switching to master---"
git checkout master
echo "---merge test branch---"
git merge test-branch

echo "Enter commit message: "
read -r message
echo "The commit message is: $message"

echo "---generate swagger documentation---"
npm run doc

echo "---build---"
npm run build

echo "---adding changed files to staging---"
git add .

echo "---committing staged files---"
git commit -am "$message"

# push to mahathir backend repo
echo "---pushing master branch to github---"
git push origin master

echo "---switching back to test branch---"
git checkout test-branch

echo "---deploying to gcloud---"
gcloud app deploy

echo "---checking secret file changes---"
cd ../secrets
bash ./push.sh
