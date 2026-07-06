interface PhotoUploaderProps {
  photoUrl?: string;
  error?: string;
  onChange: (file?: File) => void;
}

export function PhotoUploader({ photoUrl, error, onChange }: PhotoUploaderProps) {
  return (
    <label className="block rounded-card border border-dashed border-sos-border bg-sos-background p-4 text-center">
      <span className="mx-auto mb-2 block h-8 w-8 text-3xl text-sos-muted">▣</span>
      <span className="block text-[16px] font-semibold text-sos-muted">Agregar foto opcional</span>
      <span className="mt-1 block text-[12px] font-bold text-sos-muted">Se optimiza automáticamente como JPG menor a 2 MB</span>
      <input
        type="file"
        accept="image/*"
        onChange={(event) => onChange(event.target.files?.[0])}
        className="mt-3 w-full text-[13px] font-semibold text-sos-muted"
      />
      {photoUrl && <img src={photoUrl} alt="Foto seleccionada" className="mt-3 max-h-36 w-full rounded-input object-cover" />}
      {error && <p className="mt-2 text-[13px] font-bold text-sos-pending">{error}</p>}
    </label>
  );
}
