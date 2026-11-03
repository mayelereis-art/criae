import { EMAIL_CONTATO } from "@/config/legal";

export const metadata = { title: "Termos de Uso" };

export default function Termos() {
  return (
    <>
      <h1>Termos de Uso</h1>
      <p>Estes termos regem o uso da Criaê, plataforma que ajuda pessoas a criar, publicar e vender produtos digitais com apoio de inteligência artificial.</p>

      <h2>1. Conta</h2>
      <p>Você é responsável pelos dados informados no cadastro e pela guarda da sua senha. Uma conta é pessoal e não deve ser compartilhada.</p>

      <h2>2. Conteúdo gerado com IA</h2>
      <ul>
        <li>Os textos e imagens são gerados a partir das informações que você fornece e podem conter erros.</li>
        <li>Você deve revisar o material antes de publicar ou vender, principalmente em temas de saúde, finanças e direito.</li>
        <li>O produto final é de sua autoria e responsabilidade, inclusive perante seus compradores.</li>
      </ul>

      <h2>3. Uso proibido</h2>
      <ul>
        <li>Vender conteúdo que viole direitos autorais ou marcas de terceiros.</li>
        <li>Fazer promessas enganosas de resultado (ganhos, cura, emagrecimento garantido e similares).</li>
        <li>Conteúdo ilegal, discriminatório, que incentive violência ou que exponha dados de terceiros.</li>
      </ul>
      <p>Produtos que violem estas regras podem ser despublicados e a conta suspensa.</p>

      <h2>4. Vendas e pagamentos</h2>
      <p>As vendas são processadas pelo gateway de pagamento conectado por você (inicialmente o Mercado Pago), e os valores são creditados na sua conta no gateway. As regras de reembolso e garantia que você configurar valem perante o comprador, respeitado o Código de Defesa do Consumidor.</p>

      <h2>5. Assinatura e créditos</h2>
      <p>O uso das ferramentas de IA depende de assinatura ativa e consome créditos conforme a tabela exibida no painel. Créditos não utilizados no mês não são convertidos em dinheiro.</p>

      <h2>6. Cancelamento</h2>
      <p>Você pode cancelar a assinatura a qualquer momento pelo painel. A cobrança deixa de ser renovada a partir do ciclo seguinte.</p>

      <h2>7. Contato</h2>
      <p>Dúvidas sobre estes termos: {EMAIL_CONTATO}.</p>
    </>
  );
}
