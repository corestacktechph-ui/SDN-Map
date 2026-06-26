'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { Users, Trash2, Shield, ShieldAlert, ShieldCheck } from 'lucide-react'
import { useUsers, useDeleteUser } from '@/hooks'
import { toast } from 'react-hot-toast'

const roleIcons: Record<string, typeof Shield> = {
  ADMIN: ShieldAlert,
  RESEARCHER: ShieldCheck,
  PANEL_MEMBER: Shield,
}

const roleColors: Record<string, string> = {
  ADMIN: 'text-red-500',
  RESEARCHER: 'text-blue-500',
  PANEL_MEMBER: 'text-green-500',
}

export default function AdminUsersPage() {
  const { data: users, isLoading } = useUsers()
  const deleteUser = useDeleteUser()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    try {
      await deleteUser.mutateAsync(id)
      toast.success('User deleted successfully')
      setConfirmDelete(null)
    } catch {
      toast.error('Failed to delete user')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">Manage system users and roles (Admin only)</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle className="text-lg">All Users ({users?.length ?? 0})</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading users...</div>
          ) : users && users.length > 0 ? (
            <div className="space-y-2">
              {users.map((user, i) => {
                const RoleIcon = roleIcons[user.role] || Shield
                return (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-sm font-semibold text-primary">{user.name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'} className="flex items-center gap-1">
                        <RoleIcon className={`h-3 w-3 ${roleColors[user.role] || ''}`} />
                        {user.role}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</span>
                      {confirmDelete === user.id ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(user.id)}>Confirm</Button>
                          <Button size="sm" variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(user.id)} disabled={user.role === 'ADMIN'}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <p>No users found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
