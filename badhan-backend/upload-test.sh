echo "Automatic build is enabled"
git checkout test-branch
echo "Enter commit message: "
read -r message
echo "The commit message is: $message"
git add .
git commit -am "$message"
git push origin test-branch
gcloud app deploy --project badhan-buet-test  ./app_dev.yaml --quiet
