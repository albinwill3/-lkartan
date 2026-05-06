export function getVajbLabel(temp: number): string {

  if(temp===null) return ""
  if (temp <= 1) return "Här vill jag inte va"
  if (temp <= 2) return "Dålig vajb"
  if (temp <= 3) return "Chill"
  if (temp <= 4) return "Bra vajb"
  if (temp <= 5) return "Skitbra vajb"
  return "Bra vajb"
}  