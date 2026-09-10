import childProcess = require("child_process");
import http = require("http");
import url = require("url");

http
  .createServer((request, response) => {
    const command = url.parse(request.url ?? "", true).query.command;
    if (typeof command === "string") {
      childProcess.spawn(command);
    }
    response.end("CodeQL TypeScript canary");
  })
  .listen(3001);
