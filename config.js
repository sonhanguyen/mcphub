#!/usr/bin/env node

import fs from "fs"
import bcrypt from "bcrypt"
import path from "path"
import crypto from "crypto"

const PERSISTENT_SETTINGS = "/tmp/mcphub/mcp_settings.json"
const SETTINGS = "/app/mcp_settings.json"
const SKILLS_DIR = "/app/skills"
const SKILLS_DATA_DIR = "/tmp/mcphub/skills"
const UV_CACHE_DIR = "/tmp/mcphub/uv-cache"
const { AUTH_PASSWORD, GROUP_IDS = '' } = process.env

if (!AUTH_PASSWORD) {
  console.error("No AUTH_PASSWORD environment variable found")
  process.exit(1)
}

function deepMerge(target, source) {
  switch (typeof source) {
    case 'object':
      if (Array.isArray(source)) break
      target = { ...target }
      Object.entries(source).forEach(([ key, value ]) =>
        target[key] = deepMerge(target[key] || {}, value)
      )
    case 'undefined':
      return target
  }

  return source
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}

  return Object.fromEntries(match.pop().split('\n')
    .flatMap(line => {
      const [key, value = ''] = line.split(/\s*:\s*(.+)/).map(_ => _.trim())
      if (!key) return []

      if (value.startsWith('[') && value.endsWith(']')) {
        const items = value.slice(1, -1).split(/\s*,\s*/).filter(Boolean)
        return [[key, items]]
      }

      return [[key, value]]
    })
  )
}

function discoverSkills() {
  if (!fs.existsSync(SKILLS_DIR)) return []

  return fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => {
      const skillPath = path.join(SKILLS_DIR, dirent.name)
      const skillFile = path.join(skillPath, 'SKILL.md')

      if (!fs.existsSync(skillFile)) return null

      const content = fs.readFileSync(skillFile, 'utf8')
      const { name, groups } = parseFrontmatter(content)

      return { name: name || dirent.name, path: skillPath, groups }
    })
    .filter(Boolean)
}

function setupSkillsForGroups(groups, skills) {
  if (!skills.length) return

  // Ensure UV cache directory exists
  fs.mkdirSync(UV_CACHE_DIR, { recursive: true })

  const groupNames = groups.map(_ => _.name)
  const skillsByGroup = Object.fromEntries(
    groupNames.map(name => [name, []])
  )

  skills.forEach(skill => {
    const targetGroups = Array.isArray(skill.groups)
      ? skill.groups.filter(g => groupNames.includes(g))
      : groupNames

    targetGroups.forEach(group => skillsByGroup[group].push(skill))
  })

  Object.entries(skillsByGroup).forEach(([group, groupSkills]) => {
    if (!groupSkills.length) return

    const groupSkillsDir = path.join(SKILLS_DATA_DIR, group)
    fs.mkdirSync(groupSkillsDir, { recursive: true })

    groupSkills.forEach(skill => {
      const destPath = path.join(groupSkillsDir, skill.name)
      if (fs.existsSync(destPath)) fs.rmSync(destPath, { recursive: true })
      fs.cpSync(skill.path, destPath, { recursive: true })
    })
  })

  return skillsByGroup
}

function expandGroupTemplates(groups) {
  const groupsByName = Object.fromEntries(
    groups.map(group => [group.name, group])
  )

  return groups.map(({ include, ...group }) => {
    if (!Array.isArray(include)) return group

    const inherited = include.flatMap(name => {
      const included = groupsByName[name]
      if (included) return included.servers
      throw `Group "${name}" not found for inclusion in "${group.name}"`
    })

    const servers = Object.fromEntries(
      inherited.map(it => [it.name, it]))
    for (let it of group.servers) servers[it.name] = it

    return { ...group, servers: Object.values(servers) }
  })
}

let settings = JSON.parse(fs.readFileSync(SETTINGS, "utf8"))

let persistentSettings = {}
if (fs.existsSync(PERSISTENT_SETTINGS)) {
  try {
    persistentSettings = JSON.parse(fs.readFileSync(PERSISTENT_SETTINGS, "utf8"))
    console.log("Loaded existing persistent settings")
  } catch (error) {
    console.error("Error reading persistent settings:", error.message)
  }
}

settings = deepMerge(persistentSettings, settings)

const password = bcrypt.hashSync(AUTH_PASSWORD, 10)
if (!settings.users) settings.users = []

const admin = settings.users.find(u => u.isAdmin)
  || { username: "admin", isAdmin: true, password }
if (admin) Object.assign(admin, { password })
else settings.users.push(admin)

if (settings.groups) {
  settings.groups = expandGroupTemplates(settings.groups)

  const existingIds = new Set(
    GROUP_IDS.split(',').map(_ => _.trim()).filter(Boolean)
  )

  const newGroups = settings.groups.filter(group => {
    const groupId = `${group.name}-${crypto.randomUUID()}`
    const hasExisting = Array.from(existingIds)
      .find(id => id.startsWith(`${group.name}-`))

    if (hasExisting) {
      group.id = hasExisting
      return false
    }

    group.id = groupId
    return true
  })

  if (newGroups.length) console.warn(
    'New group(s) added, please run',
    `fly secrets set GROUP_IDS="${Array.from(existingIds)
      .concat(newGroups.map(_ => _.id))
      .join(',')}"
    `
  )

  const skillsByGroup = setupSkillsForGroups(settings.groups, discoverSkills())

  if (skillsByGroup) {
    Object.entries(skillsByGroup).forEach(([group, skills]) => {
      if (!skills.length) return

      const skillsServer = group + '-skills'
      settings.mcpServers[skillsServer] = {
        command: "uvx",
        args: ["skill_to_mcp", "--skills-dir", path.join(SKILLS_DATA_DIR, group)],
        env: { 
          UV_PYTHON: "3.12",
          UV_CACHE_DIR: UV_CACHE_DIR
        }
      }

      const groupConfig = settings.groups.find(_ => _.name === group)
      if (groupConfig) {
        groupConfig.servers = groupConfig.servers || []
        if (!groupConfig.servers.find(_ => _.name === skillsServer)) {
          groupConfig.servers.push({ name: skillsServer })
        }
      }
    })
  }
}

const settingsDir = path.dirname(PERSISTENT_SETTINGS)
if (!fs.existsSync(settingsDir)) fs.mkdirSync(settingsDir, { recursive: true })

fs.writeFileSync(
  PERSISTENT_SETTINGS,
  JSON.stringify(settings, null, 2),
)
