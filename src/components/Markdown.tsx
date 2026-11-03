import ReactMarkdown from "react-markdown";

/** Markdown sem HTML bruto (react-markdown ignora HTML por padrão), com o estilo de leitura do painel. */
export function Markdown({ texto }: { texto: string }) {
  return (
    <div
      className="max-w-none text-[15px] leading-relaxed text-texto/90
        [&_blockquote]:my-4 [&_blockquote]:rounded-xl [&_blockquote]:border [&_blockquote]:border-primaria/30 [&_blockquote]:bg-primaria/8 [&_blockquote]:px-4 [&_blockquote]:py-3
        [&_h2]:mb-4 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold
        [&_h3]:mt-7 [&_h3]:mb-2 [&_h3]:font-display [&_h3]:text-lg [&_h3]:font-semibold
        [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_strong]:text-texto [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6
        [&_table]:my-4 [&_td]:border [&_td]:border-borda [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-borda [&_th]:px-2 [&_th]:py-1"
    >
      <ReactMarkdown>{texto}</ReactMarkdown>
    </div>
  );
}
