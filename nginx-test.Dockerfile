FROM nginx:1.16-alpine

RUN mkdir -p /var/www/schemio-static && mkdir -p /var/logs/schemio-static

RUN addgroup -S www-group && adduser -S www-data -G www-group

COPY dist/ /var/www/schemio-static/
COPY static-demo/nginx.conf /etc/nginx/nginx.conf
