git checkout test-branch
echo "Enter commit message: "
read -r message
echo "The commit message is: $message"
node doc/swagger.js
git add .
git commit -am "$message"

git push origin test-branch
git push heroku-test test-branch:master
