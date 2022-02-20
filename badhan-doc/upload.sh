echo "Automatic build is enabled in heroku"
echo "Enter commit message: "
read -r message
echo "The commit message is: $message"

echo "---adding changed files to staging---"
git add .

echo "---committing staged files---"
git commit -am "$message"

# push to mahathir backend repo
echo "---pushing master branch to github---"
git push origin master