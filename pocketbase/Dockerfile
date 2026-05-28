FROM alpine:latest

ARG PB_VERSION=0.38.1

RUN apk add --no-cache \
    unzip \
    ca-certificates

ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /opt/pb/

COPY pb_migrations/ /opt/pb/pb_migrations/
COPY entrypoint.sh  /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 7130

ENTRYPOINT ["/entrypoint.sh"]
