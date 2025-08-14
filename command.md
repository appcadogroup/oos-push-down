## Issue the certificate
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm certbot-init

## Apply and reload nginx:
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d nginx
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

