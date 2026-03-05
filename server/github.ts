import fetch from 'node-fetch'

const GQL = 'https://api.github.com/graphql'
const TOKEN = process.env.GITHUB_TOKEN

export type GitStats = {
  totalCommits: number
  topLanguage?: string
  stars: number
}

const TTL = 1000 * 60 * 60 // 1 hour
const cache = new Map<string, { ts: number; value: GitStats }>()

async function githubGraphQL(query: string, variables: any) {
  if (!TOKEN) throw new Error('GITHUB_TOKEN not set')
  const res = await fetch(GQL, {
    method: 'POST',
    headers: { Authorization: `bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  if (json.errors) throw new Error(json.errors.map((e: any) => e.message).join('; '))
  return json.data
}

export async function fetchGitStats(username: string): Promise<GitStats> {
  const now = Date.now()
  const cached = cache.get(username)
  if (cached && now - cached.ts < TTL) return cached.value

  const query = `query($login:String!){
    user(login:$login){
      contributionsCollection{ totalCommitContributions }
      repositories(first:100, ownerAffiliations:OWNER){
        nodes { stargazerCount primaryLanguage { name } }
      }
    }
  }`

  const data = await githubGraphQL(query, { login: username })
  const user = data?.user
  if (!user) throw new Error('GitHub user not found')

  const totalCommits = user.contributionsCollection?.totalCommitContributions || 0
  const repos = user.repositories?.nodes || []
  const stars = repos.reduce((s: number, r: any) => s + (r.stargazerCount || 0), 0)

  const langCounts: Record<string, number> = {}
  repos.forEach((r: any) => {
    const name = r.primaryLanguage?.name || 'Unknown'
    langCounts[name] = (langCounts[name] || 0) + 1
  })
  const topLanguage = Object.entries(langCounts).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0]

  const out: GitStats = { totalCommits, topLanguage, stars }
  cache.set(username, { ts: now, value: out })
  return out
}
