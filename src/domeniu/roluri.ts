/** Rolurile se scriu pe funcții, nu pe persoane. */
export const ROLURI = {
  primar: "Primarul în funcție",
  secretar: "Secretarul general",
  registratura: "Registratura",
  urbanism: "Compartimentul urbanism",
  administrator: "Administratorul aplicației",
} as const;

export type Rol = keyof typeof ROLURI;

export function esteRol(x: string | undefined): x is Rol {
  return !!x && x in ROLURI;
}
