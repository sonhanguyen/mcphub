#!/usr/bin/env node

import fs from "fs"
import bcrypt from "bcrypt"
import path from "path"

const PERSISTENT_SETTINGS = "/app/data/mcp_settings.json"
const MCP_SETTINGS = "/app/mcp_settings.json"
const { AUTH_PASSWORD } = process.env
const SALT_ROUNDS = 10

if (!AUTH_PASSWORD) {
  console.error("No AUTH_PASSWORD environment variable found")
  process.exit(1)
}

const { mcpServers = {} } = JSON.parse(fs.readFileSync(MCP_SETTINGS, "utf8"))

let settings = {}
if (fs.existsSync(PERSISTENT_SETTINGS)) {
  try {
    const content = fs.readFileSync(PERSISTENT_SETTINGS, "utf8")
    settings = JSON.parse(content)
    console.log("Loaded existing settings")
  } catch (error) {
    console.error("Error reading persistent settings:", error.message)
  }
} else {
  console.log("No existing settings found, creating")
}

console.log("Hashing password...")
const password = bcrypt.hashSync(AUTH_PASSWORD, SALT_ROUNDS)

settings = {
  ...settings,
  mcpServers,
  users: [
    {
      username: "admin",
      isAdmin: true,
      password,
    },
  ]
}

const settingsDir = path.dirname(PERSISTENT_SETTINGS)
if (!fs.existsSync(settingsDir)) fs.mkdirSync(settingsDir, { recursive: true })

fs.writeFileSync(
  PERSISTENT_SETTINGS,
  JSON.stringify(settings, null, 2),
)

console.log(
  'Admin user configured with custom password\n',
  `MCP servers: ${Object.keys(mcpServers)}`
)
