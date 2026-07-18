export default {
  async fetch(request, env) {
    // 登録APIのパスを確認
    const url = new URL(request.url);
    
    if (url.pathname === "/api/register" && request.method === "POST") {
      const { username, password } = await request.json();
      
      // D1への保存処理（後で書きます）
      await env.DB.prepare(
        "INSERT INTO users (username, password_hash) VALUES (?, ?)"
      ).bind(username, password).run();

      return new Response(JSON.stringify({ message: "登録成功" }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response("Not Found", { status: 404 });
  }
};