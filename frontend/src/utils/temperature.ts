export function getTempLabel(temp: number): string {

  if(temp===null) return ""
  if (temp <= 1) return "Iskall"
  if (temp <= 2) return "Kall"
  if (temp <= 3) return "varmkall"
  return "Ljummen"
}  