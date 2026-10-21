import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

const TEXTOS = { nome: 200, ocupacao: 200, cidade: 200, cirurgia: 1000 } as const;

const UNICAS: Record<string, string[]> = {
  tempo: ["Menos de 6 meses", "6 meses a 1 ano", "1 a 3 anos", "3 a 5 anos", "Mais de 5 anos"],
  impacto: ["Nada", "Pouco", "Moderadamente", "Muito", "Extremamente"],
  tentativas: [
    "Nada",
    "Dieta por conta própria",
    "Acompanhamento apenas com Nutricionista",
    "Acompanhamento com médico especialista",
    "Medicação por conta própria",
    "Exercícios físicos e Esportes",
  ],
  futuro: ["Igual", "Pior", "Muito pior", "Prefiro não pensar nisso"],
  sozinho: ["Provavelmente sim", "Não tenho certeza", "Provavelmente não", "Não consigo sozinho"],
  prioridade: ["Baixa prioridade", "Moderada", "Alta", "É minha prioridade número 1"],
  morofit: ["Sim", "Não"],
  programa: ["Sim, com certeza", "Provavelmente sim", "Talvez", "Provavelmente não", "Não tenho interesse"],
};

// Perguntas novas entram como opcionais: quem ainda estiver com a página antiga aberta continua conseguindo enviar.
const UNICAS_OPCIONAIS: Record<string, string[]> = {
  indicacao: [
    "Instagram",
    "Indicação de amigo ou familiar",
    "Indicação de outro profissional de saúde",
    "Google",
    "Academia Morofit",
    "Já sou paciente",
    "Outro",
  ],
};

const MULTIPLAS: Record<string, string[]> = {
  objetivo: [
    "Emagrecimento / Definição",
    "Reposição Hormonal",
    "Menopausa",
    "Lipedema",
    "Performance Física",
    "Hipertrofia / Ganho de massa muscular",
  ],
  frustracao: [
    "Não conseguir emagrecer",
    "Emagreço, mas ganho tudo de novo (EFEITO SANFONA)",
    "Cansaço, indisposição e falta de energia",
    "Sintomas menstruais (Fluxo alto e/ou cólica intensa e/ou TPM e/ou Enxaqueca)",
    "Lipedema (dor nas pernas, inchaço, manchas roxas e não emagrecer pernas)",
    "Falta de desejo sexual e Libido",
    "Não consigo ganhar massa muscular",
  ],
};

function validar(r: any): Record<string, unknown> | string {
  if (!r || typeof r !== "object" || Array.isArray(r)) return "payload inválido";
  const out: Record<string, unknown> = {};

  for (const [campo, max] of Object.entries(TEXTOS)) {
    const v = r[campo];
    if (typeof v !== "string" || !v.trim() || v.trim().length > max) return `campo inválido: ${campo}`;
    out[campo] = v.trim();
  }
  for (const [campo, ops] of Object.entries(UNICAS)) {
    if (typeof r[campo] !== "string" || !ops.includes(r[campo])) return `campo inválido: ${campo}`;
    out[campo] = r[campo];
  }
  for (const [campo, ops] of Object.entries(UNICAS_OPCIONAIS)) {
    if (r[campo] === undefined) continue;
    if (typeof r[campo] !== "string" || !ops.includes(r[campo])) return `campo inválido: ${campo}`;
    out[campo] = r[campo];
  }
  if (out.indicacao === "Outro") {
    const t = r.indicacao_outro;
    if (typeof t !== "string" || !t.trim() || t.trim().length > 200) return "campo inválido: indicacao_outro";
    out.indicacao_outro = t.trim();
  }
  for (const [campo, ops] of Object.entries(MULTIPLAS)) {
    const v = r[campo];
    if (!Array.isArray(v) || v.length === 0 || v.length > ops.length) return `campo inválido: ${campo}`;
    if (!v.every((x) => typeof x === "string" && ops.includes(x))) return `campo inválido: ${campo}`;
    out[campo] = [...new Set(v as string[])];
  }
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ erro: "método não permitido" }, 405);

  const texto = await req.text();
  if (texto.length > 20000) return json({ erro: "payload grande demais" }, 413);

  let dados: any;
  try {
    dados = JSON.parse(texto);
  } catch {
    return json({ erro: "json inválido" }, 400);
  }

  const v = validar(dados);
  if (typeof v === "string") return json({ erro: v }, 422);

  const url = Deno.env.get("SUPABASE_URL")!;
  const chave = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // indicacao e indicacao_outro não têm coluna própria: ficam no registro completo (respostas)
  const linha = {
    nome: v.nome,
    ocupacao: v.ocupacao,
    cidade: v.cidade,
    objetivo: v.objetivo,
    tempo_problema: v.tempo,
    impacto: v.impacto,
    tentativas: v.tentativas,
    cirurgia: v.cirurgia,
    frustracao: v.frustracao,
    futuro: v.futuro,
    sozinho: v.sozinho,
    prioridade: v.prioridade,
    morofit: v.morofit,
    programa: v.programa,
    respostas: v,
  };

  const resp = await fetch(`${url}/rest/v1/respostas_pre_consulta`, {
    method: "POST",
    headers: {
      apikey: chave,
      Authorization: `Bearer ${chave}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(linha),
  });

  if (!resp.ok) {
    console.error("insert falhou", resp.status, await resp.text());
    return json({ erro: "não foi possível salvar" }, 500);
  }
  return json({ ok: true });
});
