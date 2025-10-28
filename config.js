#!/usr/bin/env node

import fs from "fs"
import bcrypt from "bcrypt"
import path from "path"
import crypto from "crypto"

const PERSISTENT_SETTINGS = "/app/data/mcp_settings.json"
const SETTINGS = "/app/mcp_settings.json"
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

  const ids = Object.fromEntries(
    GROUP_IDS.split(',').map(pair => {
      const [id, name] = pair.split(':').map(_ => _.trim())
      return [name, id]
    })
  )

  const newGroups = settings.groups.filter(group => {
    if (!group.id) group.id = ids[group.name]
    if (group.id) return

    group.id = crypto.randomUUID()
    return true
  })

  if (newGroups.length) console.warn(
    'New group(s) added, please run',
    `fly secrets set GROUP_IDS="${newGroups
      .map(_ => `${_.id}:${_.name}`)
      .concat(GROUP_IDS)}"
    `
  )
}

const settingsDir = path.dirname(PERSISTENT_SETTINGS)
if (!fs.existsSync(settingsDir)) fs.mkdirSync(settingsDir, { recursive: true })

fs.writeFileSync(
  PERSISTENT_SETTINGS,
  JSON.stringify(settings, null, 2),
)
