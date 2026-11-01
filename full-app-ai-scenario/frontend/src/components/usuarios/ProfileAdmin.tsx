import { useRef, useState } from 'react';
import { useProfiles } from '../../lib/profiles/ProfilesProvider';

/** Local JSON export/import for profiles, kept out of the game state. */
export default function ProfileAdmin() {
  const { exportProfiles, importProfiles } = useProfiles();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleExport = () => {
    const blob = new Blob([exportProfiles()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'a-ver-si-sabes-perfiles.json';
    link.click();
    URL.revokeObjectURL(url);
    setMessage('Perfiles exportados.');
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    const result = importProfiles(text);
    setMessage(`Importados: ${result.imported} · Omitidos: ${result.skipped}`);
  };

  return (
    <div className="mt-4 flex flex-col items-center gap-2">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={handleExport}
          className="flex items-center gap-1.5 rounded-lg border border-[#2a2a2a] bg-[#101010] px-3 py-1.5 font-display text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0] transition-all hover:text-light-text"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
            download
          </span>
          Exportar perfiles
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-lg border border-[#2a2a2a] bg-[#101010] px-3 py-1.5 font-display text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0] transition-all hover:text-light-text"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
            upload
          </span>
          Importar perfiles
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          aria-label="Importar perfiles JSON"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleImport(file);
          }}
        />
      </div>
      {message !== null && <span className="text-[11px] text-lime-pastel">{message}</span>}
    </div>
  );
}
