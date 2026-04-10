// Default colors assigned to new players in sequence
export const DEFAULT_PLAYER_COLORS = [
  '#f5a623', // orange
  '#6c8ef5', // blue
  '#4caf7d', // green
  '#e05d5d', // red
  '#b06cf5', // purple
  '#4db6ac', // teal
  '#f06292', // pink
  '#fff176', // yellow
]

export function getDefaultColor(index: number): string {
  return DEFAULT_PLAYER_COLORS[index % DEFAULT_PLAYER_COLORS.length]
}

export function getInitial(name: string) {
  return name ? name.charAt(0).toUpperCase() : '?'
}