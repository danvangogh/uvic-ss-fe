# SSH into the server and run this script to build the project
ssh prism << 'ENDSSH'
cd /var/www/uvic-ss-fe
git pull
cd backend
npm install
cd ../content-prism
npm install
npm run build
cd ..
pm2 restart all
exit
ENDSSH
