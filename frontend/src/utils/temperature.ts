export function getTempLabel(temp: number): string {

  if (temp === null) return ""
  if (temp <= 1) return "Ljummen"
  if (temp <= 2) return "Varmkall"
  if (temp <= 3) return "Kall"
  return "Iskall"
}  