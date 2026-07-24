import bcrypt from "bcryptjs";

function generateToken() {
  return crypto.randomUUID();
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://chat-app-42g.pages.dev",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Credentials": "true"
};

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...extraHeaders
    }
  });
}

export default {
  async fetch(request, env) {
    // ブラウザからの事前確認(OPTIONS)に応答
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // ---------- /api/register ----------
    if (url.pathname === "/api/register" && request.method === "POST") {
      const { username, password } = await request.json();

      if (!username || !password) {
        return jsonResponse({ message: "ユーザー名とパスワードは必須です" }, 400);
      }

      const existing = await env.DB.prepare(
        "SELECT id FROM users WHERE username = ?"
      )
        .bind(username)
        .first();

      if (existing) {
        return jsonResponse({ message: "そのユーザー名は既に使われています" }, 409);
      }

      const hash = await bcrypt.hash(password, 12);

      await env.DB.prepare(
        "INSERT INTO users (username, password_hash) VALUES (?, ?)"
      )
        .bind(username, hash)
        .run();

      return jsonResponse({ message: "登録成功" });
    }

    // ---------- /api/login ----------
    if (url.pathname === "/api/login" && request.method === "POST") {
      const { username, password } = await request.json();

      const user = await env.DB.prepare(
        "SELECT * FROM users WHERE username = ?"
      )
        .bind(username)
        .first();

      if (!user) {
        return jsonResponse({ message: "ユーザーが存在しません" }, 404);
      }

      const ok = await bcrypt.compare(password, user.password_hash);

      if (!ok) {
        return jsonResponse({ message: "パスワードが違います" }, 401);
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

      return jsonResponse(
        { message: "ログイン成功！" },
        200,
        {
          "Set-Cookie": `session=${token}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`
        }
      );
    }

    // ---------- /api/send ----------
    if (url.pathname === "/api/send" && request.method === "POST") {
      const { username, message, chat_id } = await request.json();

      const user = await env.DB.prepare(
        "SELECT id FROM users WHERE username = ?"
      )
        .bind(username)
        .first();

      if (!user) {
        return jsonResponse({ message: "ユーザーが存在しません" }, 404);
      }

      await env.DB.prepare(
        "INSERT INTO messages (chat_id, user_id, message) VALUES (?, ?, ?)"
      )
        .bind(chat_id, user.id, message)
        .run();

      return jsonResponse({ message: "送信成功" });
    }

    // ---------- /api/chats ----------
    if (url.pathname === "/api/chats" && request.method === "GET") {
      const username = url.searchParams.get("username");

      const user = await env.DB.prepare(
        "SELECT id FROM users WHERE username = ?"
      )
        .bind(username)
        .first();

      if (!user) {
        return jsonResponse({ message: "ユーザーが存在しません" }, 404);
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

      return jsonResponse(chats.results);
    }

    // ---------- /api/messages ----------
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

      return jsonResponse(messages.results);
    }

    // ---------- /api/create-chat ----------
    if (url.pathname === "/api/create-chat" && request.method === "POST") {
      const { username, name } = await request.json();

      const user = await env.DB.prepare(
        "SELECT id FROM users WHERE username = ?"
      )
        .bind(username)
        .first();

      if (!user) {
        return jsonResponse({ message: "ユーザーが存在しません" }, 404);
      }

      const result = await env.DB.prepare(
        "INSERT INTO chats (name, type) VALUES (?, ?)"
      )
        .bind(name, "group")
        .run();

      const chatId = result.meta.last_row_id;

      await env.DB.prepare(
        "INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)"
      )
        .bind(chatId, user.id)
        .run();

      return jsonResponse({ message: "作成成功", chat_id: chatId });
    }

    // ---------- /api/delete-chat ----------
    if (url.pathname === "/api/delete-chat" && request.method === "POST") {
      const { chat_id } = await request.json();

      await env.DB.prepare("DELETE FROM chat_members WHERE chat_id = ?")
        .bind(chat_id)
        .run();

      await env.DB.prepare("DELETE FROM messages WHERE chat_id = ?")
        .bind(chat_id)
        .run();

      await env.DB.prepare("DELETE FROM chats WHERE id = ?")
        .bind(chat_id)
        .run();

      return jsonResponse({ message: "削除しました" });
    }

    if (url.pathname === "/api/logout" && request.method === "POST") {

  const cookie = request.headers.get("Cookie") || "";

  const match = cookie.match(/session=([^;]+)/);

  if (!match) {
    return jsonResponse({
      message: "ログインしていません"
    }, 401);
  }

  const token = match[1];

  await env.DB.prepare(
    "DELETE FROM sessions WHERE token = ?"
  )
  .bind(token)
  .run();

  return jsonResponse(
    {
      message: "ログアウトしました"
    },
    200,
    {
      "Set-Cookie":
        "session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax"
    }
  );
}

    // どのAPIにも一致しなかった場合
    return new Response("Not Found", {
      status: 404,
      headers: corsHeaders
    });
  }
};