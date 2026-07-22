const corsHeaders = {
  "Access-Control-Allow-Origin": "https://chat-app-42g.pages.dev",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
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

      await env.DB.prepare(
        "INSERT INTO users (username, password_hash) VALUES (?, ?)"
      )
      .bind(username, password)
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

  if (user.password_hash !== password) {
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

  return new Response(
    JSON.stringify({ message: "ログイン成功！" }),
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