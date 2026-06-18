export interface BookingAddon {
  id: string;
  label: string;
  price: number;
}

export function getSelfShootAddons(packageName?: string | null): BookingAddon[] {
  const isSoloOrPakners = packageName ? /solo|pakner/i.test(packageName) : true;

  return [
    { id: "4r-hard-copy", label: "4R Hard Copy", price: 30 },
    { id: "additional-person", label: "Additional Person", price: 80 },
    { id: "a4-sintra-board", label: "A4 Sintra Board", price: 90 },
    { id: "a4-print", label: "A4 Print", price: 70 },
    { id: "props-access", label: "Full Access to All Props", price: 50 },
    { id: "add-background", label: "Add 1 Background", price: 150 },
    {
      id: "all-soft-copies",
      label: isSoloOrPakners ? "All Soft Copies (Solo/Pakners)" : "All Soft Copies (Trio/Tropa/Family)",
      price: isSoloOrPakners ? 100 : 150,
    },
  ];
}

export function formatAddonNotes(addons: BookingAddon[]): string | null {
  if (addons.length === 0) return null;
  return `Additionals: ${addons.map((addon) => `${addon.label} (PHP ${addon.price})`).join(", ")}`;
}
