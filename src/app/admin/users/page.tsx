import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { RoleSelector } from "./RoleSelector"

const ADMIN_EMAIL = "tobigiorgis@icloud.com"

export default async function AdminUsersPage() {
  const user = await currentUser()
  if (user?.emailAddresses[0]?.emailAddress !== ADMIN_EMAIL) redirect("/dashboard")

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      workspaces: { select: { workspaceId: true } },
      creatorProfile: { select: { id: true, name: true } },
    },
  })

  return (
    <div className="min-h-screen bg-[#F9F9FB] px-4 py-8 lg:px-10 lg:py-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin" className="text-[12px] text-gray-400 hover:text-gray-600 transition-colors">
            ← Admin
          </Link>
          <span className="text-gray-200">/</span>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Usuarios</h1>
          <span className="ml-auto text-[12px] font-mono text-gray-400">{users.length} total</span>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Email</th>
                  <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-4 py-3">Nombre</th>
                  <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-4 py-3">Marcas</th>
                  <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-4 py-3">Perfil creator</th>
                  <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-4 py-3">Rol</th>
                  <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Creado</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} className={i < users.length - 1 ? "border-b border-gray-50" : ""}>
                    <td className="px-5 py-3.5">
                      <p className="text-[13px] font-medium text-gray-900">{u.email}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[12px] text-gray-700">{u.name ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[12px] text-gray-700">
                        {u.workspaces.length > 0 ? u.workspaces.length : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {u.creatorProfile ? (
                        <span className="text-[12px] text-gray-700">{u.creatorProfile.name}</span>
                      ) : (
                        <span className="text-[11px] text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <RoleSelector userId={u.id} role={u.role} />
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[12px] font-mono text-gray-500">
                        {u.createdAt.toLocaleDateString("es-AR")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
