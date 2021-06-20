echo "Enter commit message: "
read -r message
echo "The commit message is: $message"
node doc/swagger.js
git add .
git commit -am "$message"

# push to mahathir backend repo
git push origin master

# push to remote-aniruddha repo
#git push remote-aniruddha master

# push to mahathir heroku app
git push heroku master

gcloud app deploy

# push to aniruddha heroku app
#git push heroku-deprecated master

cd ../secrets
bash ./push.sh
