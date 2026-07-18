import http from "node:http";

const port = Number(process.env.MOCK_OPENAI_PORT || 43119);
const server = http.createServer((request, response) => {
  response.setHeader("Content-Type", "application/json");
  if (request.method === "GET" && request.url === "/v1/models") {
    response.end(JSON.stringify({ object: "list", data: [{ id: "analysis-reasoner" }, { id: "execution-writer" }, { id: "gpt-image-1" }] }));
    return;
  }
  if (request.method === "POST" && request.url === "/v1/chat/completions") {
    const malformedWritingDraft = {
      artifactKind: "writing",
      constraints: { mustInclude: [], mustAvoid: ["不要把单一信号当作结论"], mustKeep: [] },
      writing: {
        topic: "如何判断一个人是否真的常看书",
        audience: ["知乎读者"],
        purpose: "给出克制的判断框架",
        thesis: "观察持续行为，但保留判断边界",
        supportingClaims: ["持续行为比展示更可靠"],
        counterArguments: [],
        structure: ["区分阅读习惯与阅读人设", "列出持续行为", "说明判断边界"],
        targetLength: "1600",
        formattingRules: ["短段落"],
        confirmedFacts: [],
        uncertainFacts: [],
      },
    };
    response.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(malformedWritingDraft) } }] }));
    return;
  }
  response.statusCode = 404;
  response.end(JSON.stringify({ error: "not found" }));
});

server.listen(port, "127.0.0.1");

for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit(0)));
