import { EMAIL_CONTATO } from "@/config/legal";

export const metadata = { title: "Política de Privacidade" };

export default function Privacidade() {
  return (
    <>
      <h1>Política de Privacidade</h1>
      <p>Esta política explica quais dados pessoais a Criaê trata, por quê e quais são os seus direitos, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).</p>

      <h2>1. Dados que coletamos</h2>
      <ul>
        <li><strong>Cadastro:</strong> nome, e-mail e senha (a senha é guardada pelo Firebase Authentication, nunca em texto aberto).</li>
        <li><strong>Conteúdo:</strong> informações dos produtos que você cria, textos e imagens gerados.</li>
        <li><strong>Vendas:</strong> dados dos pedidos dos seus produtos (nome e e-mail do comprador, valor, status). Dados de cartão ficam só com o gateway de pagamento.</li>
        <li><strong>Uso:</strong> consumo de créditos de IA e registros técnicos de segurança.</li>
      </ul>

      <h2>2. Para que usamos</h2>
      <ul>
        <li>Prestar o serviço contratado (execução de contrato).</li>
        <li>Cobrar a assinatura e registrar vendas (execução de contrato e obrigação legal).</li>
        <li>Prevenir fraude e abuso (legítimo interesse).</li>
      </ul>

      <h2>3. Com quem compartilhamos</h2>
      <ul>
        <li>Google Firebase / Google Cloud: hospedagem e banco de dados.</li>
        <li>Anthropic e OpenAI: o conteúdo que você envia para gerar textos e imagens.</li>
        <li>Mercado Pago: processamento de pagamentos.</li>
      </ul>
      <p>Não vendemos dados pessoais.</p>

      <h2>4. Seus direitos</h2>
      <p>Você pode pedir acesso, correção, portabilidade ou exclusão dos seus dados, além de revogar consentimentos, pelo e-mail {EMAIL_CONTATO}. A exportação e a exclusão da conta também ficarão disponíveis em Minha conta.</p>

      <h2>5. Retenção</h2>
      <p>Mantemos os dados enquanto a conta estiver ativa. Registros de vendas e pagamentos são guardados pelo prazo exigido pela legislação fiscal.</p>

      <h2>6. Segurança</h2>
      <p>Os dados de cada conta são isolados por regras de acesso no banco de dados, e as chaves de serviços externos ficam apenas no servidor.</p>
    </>
  );
}
