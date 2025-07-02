echo "Automatic build is enabled"
echo "---switching to master---"
git checkout master
echo "---merge test branch---"
git merge test-branch

# push to mahathir backend repo
echo "---pushing master branch to github---"
git push origin master

echo "---deploying to gcloud---"
gcloud app deploy --project badhan-buet  ./app_prod.yaml --quiet

echo "---switching back to test branch---"
git checkout test-branch

