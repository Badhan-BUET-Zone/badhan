echo "Enter commit message: "
read -r message
echo "The commit message is: $message"
node doc/swagger.js
git add .
git commit -am "$message"
git push origin master
git push origin2 master
git push heroku master