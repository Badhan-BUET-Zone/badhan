FROM --platform=linux/amd64 node:20-buster-slim
RUN apt update
RUN apt-get install -y ca-certificates
RUN apt-get -y install libgssapi-krb5-2
RUN update-ca-certificates
WORKDIR /badhan-backup
EXPOSE 4000
CMD [ "npm", "start" ]
