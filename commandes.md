sudo lsof -i :5432
sudo systemctl status postgresql
sudo systemctl stop postgresql
docker-compose down -v  # Optional: removes volumes for a fresh DB start if you want


docker-compose up -d --build
ou (séquentiel):
docker-compose build server
docker-compose build web
docker-compose up -d



logs:
sudo docker-compose logs -f server
sudo docker-compose logs -f web



checker les types avant de build:
bun run typecheck