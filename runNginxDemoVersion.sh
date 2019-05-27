docker build -t schemio-static -f nginx-test.Dockerfile .
docker run -it -p 8080:8080 schemio-static
