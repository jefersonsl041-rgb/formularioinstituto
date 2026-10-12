// Chamada 1x por dia pelo Cron Job da Vercel (vercel.json → "crons").
// Faz uma consulta leve no Supabase para o projeto gratuito não ser pausado por inatividade (7 dias).
const SUPABASE_URL = "https://pvqikdeovfgbslfqjmxy.supabase.co";
const SUPABASE_KEY = "sb_publishable_4KZqDuVMsHQhzzZjsRuQUg_ese9wsRu";

module.exports = async function handler(req, res) {
  try {
    // lê de fato uma linha (só o id), para contar como atividade real no banco; nada é devolvido nesta resposta
    const r = await fetch(`${SUPABASE_URL}/rest/v1/respostas_pre_consulta?select=id&limit=1`, {
      headers: { apikey: SUPABASE_KEY },
    });
    res.status(r.ok ? 200 : 502).json({ ok: r.ok, supabase: r.status, em: new Date().toISOString() });
  } catch (e) {
    res.status(502).json({ ok: false, erro: String(e), em: new Date().toISOString() });
  }
}
