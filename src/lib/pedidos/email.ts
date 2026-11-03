import "server-only";

const escapar = (t: string) => t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** E-mail do comprador com o link seguro de download. O remetente padrão do Resend só entrega ao dono da conta. */
export async function enviarEntrega(d: { para: string; nome: string; itens: { titulo: string }[]; link: string }) {
  const chave = process.env.RESEND_API_KEY;
  if (!chave) throw new Error("RESEND_API_KEY não configurada");
  const titulos = d.itens.map((i) => `<li>${escapar(i.titulo)}</li>`).join("");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_REMETENTE || "Criaê <onboarding@resend.dev>",
      to: [d.para],
      subject: `Seu produto chegou: ${d.itens[0].titulo}`.slice(0, 140),
      html: `<p>Olá, ${escapar(d.nome)}!</p>
<p>Seu pagamento foi confirmado. Aqui está o que você comprou:</p><ul>${titulos}</ul>
<p><a href="${escapar(d.link)}">Baixar meu produto</a></p>
<p>O link é pessoal. Guarde este e-mail para baixar de novo quando precisar.</p>`,
    }),
  });
  if (!res.ok) throw new Error(`Resend respondeu ${res.status}: ${(await res.text()).slice(0, 200)}`);
}
