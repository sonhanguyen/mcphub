#!/usr/bin/env node

import fs from "fs"
import bcrypt from "bcrypt"
import path from "path"

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
  const groups = {}
  GROUP_IDS.split(',').forEach(pair => {
    const [id, name] = pair.split(':').map(s => s.trim())
    if (id && name) groups[name] = id
  })

  settings.groups.forEach(group => {
    group.id = groups[group.name]
    if (!group.id) console.error(`Error: Group "${group.name}" is should have an ID in either the config or GROUP_IDS (env)`)
  })
}

const settingsDir = path.dirname(PERSISTENT_SETTINGS)
if (!fs.existsSync(settingsDir)) fs.mkdirSync(settingsDir, { recursive: true })

// Write merged settings
fs.writeFileSync(
  PERSISTENT_SETTINGS,
  JSON.stringify(settings, null, 2),
)

console.log(
  'Configuration merged successfully\n',
  `MCP servers: ${Object.keys(settings.mcpServers)}`
)
