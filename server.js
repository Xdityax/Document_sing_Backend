import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  const parsed = {};
  const fileContents = readFileSync(filePath, "utf8");

  for (const line of fileContents.split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmedLine.indexOf("=");

    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, equalsIndex).trim();
    const rawValue = trimmedLine.slice(equalsIndex + 1).trim();
    const value = rawValue.replace(/^['\"]|['\"]$/g, "");

    if (key) {
      parsed[key] = value;
    }
  }

  return parsed;
}

const rootDir = resolve(process.cwd(), "..");
const envSources = [
  resolve(process.cwd(), ".env"),
  resolve(rootDir, "frontend", ".env"),
  resolve(rootDir, ".env")
];

const fileEnv = Object.assign({}, ...envSources.map(parseEnvFile));
const supabaseUrl = process.env.SUPABASE_URL || fileEnv.SUPABASE_URL || fileEnv.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || fileEnv.SUPABASE_ANON_KEY || fileEnv.VITE_SUPABASE_ANON_KEY || "";

function isConfiguredValue(value) {
  return Boolean(value && !value.includes("YOUR_") && !value.includes("PLACEHOLDER"));
}

const port = Number(process.env.PORT || 3001);

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  });
  response.end(JSON.stringify(payload));
}

async function readRequestBody(request) {
  return await new Promise((resolveBody, rejectBody) => {
    const chunks = [];

    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      const rawBody = Buffer.concat(chunks).toString("utf8");

      if (!rawBody) {
        resolveBody({});
        return;
      }

      try {
        resolveBody(JSON.parse(rawBody));
      } catch (error) {
        rejectBody(error);
      }
    });
    request.on("error", rejectBody);
  });
}

async function proxySupabaseAuth(pathname, body) {
  if (!isConfiguredValue(supabaseUrl) || !isConfiguredValue(supabaseAnonKey)) {
    return {
      status: 503,
      payload: {
        error: "Supabase credentials are not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY, or VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
      }
    };
  }

  const endpoint = new URL(`${supabaseUrl.replace(/\/$/, "")}/auth/v1${pathname}`);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const responseText = await response.text();
  let payload = null;

  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = { raw: responseText };
    }
  }

  return {
    status: response.status,
    payload: payload ?? {}
  };
}

const server = createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
    });
    response.end();
    return;
  }

  if (request.method === "GET" && request.url === "/health") {
    sendJson(response, 200, {
      ok: true,
      service: "document-signature-backend",
      supabaseConfigured: isConfiguredValue(supabaseUrl) && isConfiguredValue(supabaseAnonKey)
    });
    return;
  }

  if (request.method === "POST" && request.url === "/api/auth/login") {
    try {
      const body = await readRequestBody(request);
      const { status, payload } = await proxySupabaseAuth("/token?grant_type=password", {
        email: body.email,
        password: body.password
      });

      sendJson(response, status, payload);
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Invalid request body."
      });
    }
    return;
  }

  if (request.method === "POST" && request.url === "/api/auth/register") {
    try {
      const body = await readRequestBody(request);
      const { status, payload } = await proxySupabaseAuth("/signup", {
        email: body.email,
        password: body.password
      });

      sendJson(response, status, payload);
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Invalid request body."
      });
    }
    return;
  }

  if (request.method === "POST" && request.url === "/api/auth/logout") {
    sendJson(response, 200, { ok: true });
    return;
  }

  sendJson(response, 404, {
    error: "Not found"
  });
});

server.listen(port, () => {
  console.log(`Backend API running on http://localhost:${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});
