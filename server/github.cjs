const fetch = (global.fetch) ? global.fetch : require('node-fetch')

const GQL = 'https://api.github.com/graphql'
const TOKEN = process.env.GITHUB_TOKEN

const TTL = 1000 * 60 * 60 // 1 hour
const cache = new Map()

async function githubGraphQL(query, variables) {
  if (!TOKEN) throw new Error('GITHUB_TOKEN not set')
  const res = await fetch(GQL, {
    method: 'POST',
    headers: { Authorization: `bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  if (json.errors) throw new Error(json.errors.map(e => e.message).join('; '))
  return json.data
}

async function fetchGitStats(username) {
  const now = Date.now()
  const cached = cache.get(username)
  if (cached && now - cached.ts < TTL) return cached.value

  const query = `query($login:String!){\n    user(login:$login){\n      contributionsCollection{ totalCommitContributions }\n      repositories(first:100, ownerAffiliations:OWNER){\n        nodes { stargazerCount primaryLanguage { name } }\n      }\n    }\n  }`

  const data = await githubGraphQL(query, { login: username })
  const user = data && data.user
  if (!user) throw new Error('GitHub user not found')

  const totalCommits = user.contributionsCollection && user.contributionsCollection.totalCommitContributions || 0
  const repos = (user.repositories && user.repositories.nodes) || []
  const stars = repos.reduce((s, r) => s + (r.stargazerCount || 0), 0)

  const langCounts = {}
  repos.forEach(r => {
    const name = (r.primaryLanguage && r.primaryLanguage.name) || 'Unknown'
    langCounts[name] = (langCounts[name] || 0) + 1
  })
  const topLanguage = Object.entries(langCounts).sort((a,b) => b[1]-a[1])[0] && Object.entries(langCounts).sort((a,b) => b[1]-a[1])[0][0]

  const out = { totalCommits, topLanguage, stars }
  cache.set(username, { ts: now, value: out })
  return out
}

module.exports = { fetchGitStats }
