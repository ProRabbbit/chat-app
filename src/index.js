import bcrypt from "bcryptjs";
function generateToken() {
  return crypto.randomUUID();
}
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://chat-app-42g.pages.dev",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Credentials": "true"
};

export default {
  async fetch(request, env) {
    // ブラウザからの事前確認(OPTIONS)に応答
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders
      });
    }

    const url = new URL(request.url);

    if (url.pathname === "/api/register" && request.method === "POST") {
      const { username, password } = await request.json();

      const hash = await bcrypt.hash(password, 12);

await env.DB.prepare(
  "INSERT INTO messages (chat_id, user_id, message) VALUES (?, ?, ?)"
)
.bind(chat_id, user.id, message)
.run();

      return new Response(
        JSON.stringify({ message: "登録成功" }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }

    if (url.pathname === "/api/send" && request.method === "POST") {

  const { username, message, chat_id } = await request.json();

  const user = await env.DB.prepare(
    "SELECT id FROM users WHERE username = ?"
  )
  .bind(username)
  .first();

  if (!user) {
    return new Response(
      JSON.stringify({ message: "ユーザーが存在しません" }),
      {
        status: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }

  await env.DB.prepare(
    "INSERT INTO messages (user_id, message) VALUES (?, ?)"
  )
  .bind(user.id, message)
  .run();

  return new Response(
    JSON.stringify({ message: "送信成功" }),
    {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    }
  );
}

    if (url.pathname === "/api/login" && request.method === "POST") {

  const { username, password } = await request.json();

  const user = await env.DB.prepare(
    "SELECT * FROM users WHERE username = ?"
  )
  .bind(username)
  .first();

  if (!user) {
    return new Response(
      JSON.stringify({ message: "ユーザーが存在しません" }),
      {
        status: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }

  const ok = await bcrypt.compare(password, user.password_hash);

if (!ok) {
    return new Response(
      JSON.stringify({ message: "パスワードが違います" }),
      {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }

const token = generateToken();

const expiresAt = new Date(
  Date.now() + 30 * 24 * 60 * 60 * 1000
).toISOString();

await env.DB.prepare(
  "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)"
)
.bind(token, user.id, expiresAt)
.run();



  return new Response(
  JSON.stringify({ message: "ログイン成功！" }),
  {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",

      "Set-Cookie":
        `session=${token}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`
    }
  }
);
}

if (url.pathname === "/api/chats" && request.method === "GET") {

  const username = url.searchParams.get("username");

  const user = await env.DB.prepare(
    "SELECT id FROM users WHERE username = ?"
  )
  .bind(username)
  .first();

  if (!user) {
    return new Response(
      JSON.stringify({ message: "ユーザーが存在しません" }),
      {
        status: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }

  const chats = await env.DB.prepare(`
    SELECT chats.id, chats.name, chats.type
    FROM chats
    JOIN chat_members
      ON chats.id = chat_members.chat_id
    WHERE chat_members.user_id = ?
    ORDER BY chats.name
  `)
  .bind(user.id)
  .all();

  return new Response(
    JSON.stringify(chats.results),
    {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    }
  );
}

if (url.pathname === "/api/messages" && request.method === "GET") {

  const chatId = url.searchParams.get("chat_id");

const messages = await env.DB.prepare(`
SELECT
    messages.id,
    users.username,
    messages.message,
    messages.created_at
FROM messages
JOIN users
    ON messages.user_id = users.id
WHERE messages.chat_id = ?
ORDER BY messages.created_at ASC
`)
.bind(chatId)
.all();

  return new Response(
    JSON.stringify(messages.results),
    {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    }
  );
}

    return new Response("Not Found", {
      status: 404,
      headers: corsHeaders
    });
  }
};