import http from "node:http";

const port = Number(process.env.MOCK_OPENAI_PORT || 43119);
const server = http.createServer((request, response) => {
  response.setHeader("Content-Type", "application/json");
  if (request.method === "GET" && request.url === "/v1/models") {
    response.end(JSON.stringify({ object: "list", data: [{ id: "analysis-reasoner" }, { id: "execution-writer" }, { id: "gpt-image-1" }] }));
    return;
  }
  response.statusCode = 404;
  response.end(JSON.stringify({ error: "not found" }));
});

server.listen(port, "127.0.0.1");

for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit(0)));
