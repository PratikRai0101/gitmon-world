export type GitStats = {
  totalCommits: number
  topLanguage?: string
  stars?: number
}

export type BuildingConfig = {
  width: number
  height: number
  roofColor: string
  type: 'cottage' | 'house' | 'mansion'
}

export function mapLanguageToColor(lang?: string) {
  if (!lang) return 'gray'
  const key = lang.toLowerCase()
  if (key.includes('javascript')) return '#FFD43B'
  if (key.includes('python')) return '#2ECC71'
  if (key.includes('rust')) return '#DE6A31'
  return '#888888'
}

export default function gitMonLogic(stats: GitStats): BuildingConfig {
  const commits = stats.totalCommits || 0
  let width = 1
  let height = 1
  let type: BuildingConfig['type'] = 'cottage'

  if (commits > 500) {
    width = 3
    height = 3
    type = 'mansion'
  } else if (commits >= 100) {
    width = 2
    height = 2
    type = 'house'
  }

  const roofColor = mapLanguageToColor(stats.topLanguage)

  return { width, height, roofColor, type }
}
