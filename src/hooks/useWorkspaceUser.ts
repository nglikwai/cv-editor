import { useState } from 'react'

const USERS_KEY = 'cv-workspace-users'
const ACTIVE_USER_KEY = 'cv-active-user'

const DEFAULT_USERS = [
  { id: 'default', name: 'will', initials: 'W' },
]

const readUsers = () => {
  try {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || 'null')
    if (!Array.isArray(users) || !users.length) return DEFAULT_USERS
    return users.map((user) => user.id === 'default'
      ? { ...user, name: 'will', initials: 'W' }
      : user)
  } catch {
    return DEFAULT_USERS
  }
}

export const useWorkspaceUser = () => {
  const [users, setUsers] = useState(readUsers)
  const [activeUserId, setActiveUserId] = useState(() => {
    try {
      return localStorage.getItem(ACTIVE_USER_KEY) || DEFAULT_USERS[0].id
    } catch {
      return DEFAULT_USERS[0].id
    }
  })
  const activeUser = users.find((user) => user.id === activeUserId) || users[0]

  const switchUser = (userId) => {
    const nextUser = users.find((user) => user.id === userId)
    if (!nextUser) return
    setActiveUserId(nextUser.id)
    try {
      localStorage.setItem(ACTIVE_USER_KEY, nextUser.id)
      localStorage.setItem(USERS_KEY, JSON.stringify(users))
    } catch {
      // User preference persistence is optional when storage is unavailable.
    }
  }

  const addUser = (name) => {
    const trimmedName = name.trim()
    if (!trimmedName) return activeUser
    const id = `${trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`
    const user = { id, name: trimmedName, initials: trimmedName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() }
    const nextUsers = [...users, user]
    setUsers(nextUsers)
    setActiveUserId(id)
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(nextUsers))
      localStorage.setItem(ACTIVE_USER_KEY, id)
    } catch {
      // User preference persistence is optional when storage is unavailable.
    }
    return user
  }

  return { users, activeUser, switchUser, addUser }
}

export const workspaceStorageKey = (key, userId) => `${key}:${userId || 'default'}`
