const childProcess = require("child_process");
const http = require("http");
const url = require("url");

http
  .createServer((request, response) => {
    const command = url.parse(request.url, true).query.command;
    childProcess.spawn(command);
    response.end("CodeQL JavaScript canary");
  })
  .listen(3000);
