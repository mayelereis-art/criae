export function LogoMarca({ tamanho = 32 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 32 32" aria-hidden="true">
      {/* cores sólidas: o logo aparece duas vezes (menu desktop oculto + topo mobile) e gradiente por id quebra quando o primeiro está display:none */}
      <rect x="1" y="1" width="30" height="30" rx="9" fill="#0b1630" stroke="#4d7dff" strokeWidth="1.5" />
      {/* faísca de quatro pontas: a ideia que vira produto */}
      <path d="M16 6.5c.9 4.6 2.9 6.6 7.5 7.5-4.6.9-6.6 2.9-7.5 7.5-.9-4.6-2.9-6.6-7.5-7.5 4.6-.9 6.6-2.9 7.5-7.5Z" fill="#5b8cff" />
      <circle cx="23.5" cy="23" r="1.8" fill="#38bdf8" />
    </svg>
  );
}

export function Logo({ subtitulo = true }: { subtitulo?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMarca />
      <div className="leading-none">
        <span className="font-display text-xl font-bold tracking-tight">
          Cria<span className="text-primaria-clara">ê</span>
        </span>
        {subtitulo && (
          <span className="mt-1 block font-mono text-[9px] tracking-[0.28em] text-apagado uppercase">da ideia à venda</span>
        )}
      </div>
    </div>
  );
}
