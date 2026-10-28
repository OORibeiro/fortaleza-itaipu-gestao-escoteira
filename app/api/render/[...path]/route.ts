
const ORIGIN = "https://grupo-escoteiro.onrender.com";

const routes: Record<string, RegExp[]> = {
  GET: [/^finances$/, /^dues$/, /^branches$/],
  POST: [
    /^auth\/login$/,
    /^auth\/change-password$/,
    /^finances$/,
  ],
  PUT: [
    /^finances\/\d+$/,
    /^dues\/\d+\/pay$/,
  ],
  DELETE: [/^finances\/\d+$/],
};

async function proxy(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const target = path.join("/");

  if (!routes[request.method]?.some((pattern) => pattern.test(target))) {
    return Response.json(
      { error: "Rota não permitida." },
      { status: 404 }
    );
  }

  const headers = new Headers({
    Accept: "application/json",
  });

  const authorization = request.headers.get("authorization");

  if (authorization) {
    headers.set("Authorization", authorization);
  }

  const hasBody = request.method !== "GET";

  if (hasBody) {
    headers.set("Content-Type", "application/json");
  }

  const url = new URL(target, `${ORIGIN}/`);
  const month = new URL(request.url).searchParams.get("month");

  if (month && target === "dues") {
    url.searchParams.set("month", month);
  }

  try {
    const upstream = await fetch(url, {
      method: request.method,
      headers,
      body: hasBody ? await request.text() : undefined,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(60000),
    });

    if (upstream.status >= 300 && upstream.status < 400) {
      console.error(
        "A API do Render respondeu com redirecionamento:",
        upstream.status
      );

      return Response.json(
        {
          error:
            "A API respondeu com redirecionamento. Confira o endereço configurado no projeto.",
        },
        { status: 502 }
      );
    }

    const data = await upstream.json().catch(() => ({
      error:
        upstream.status === 404
          ? "Rota não publicada no Render. Confira a publicação do backend."
          : "Resposta inesperada do servidor.",
    }));

    return Response.json(data, {
      status: upstream.status,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(
      "Falha ao conectar com a API do Render:",
      error
    );

    const timedOut =
      error instanceof Error &&
      (error.name === "TimeoutError" ||
        error.name === "AbortError");

    return Response.json(
      {
        error: timedOut
          ? "O servidor não respondeu a tempo. Atualize os dados antes de repetir um lançamento ou pagamento."
          : "Não foi possível conectar à API do Render. Confira o erro no terminal.",
      },
      { status: timedOut ? 504 : 502 }
    );
  }
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PUT,
  proxy as DELETE,
};
