echo "Enter commit message: "
read -r message
echo "The commit message is: $message"

echo "---adding changed files to staging---"
git add .

echo "---committing staged files---"
git commit -am "$message"

echo "---pushing master branch to github---"
git push origin master
