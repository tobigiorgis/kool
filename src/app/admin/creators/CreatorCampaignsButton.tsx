"use client"

import { useState } from "react"
import { X } from "lucide-react"

interface CampaignEntry {
  id: string
  name: string
  workspaceName: string
  campaignStatus: string
  creatorStatus: string
  joinedAt: string
}

interface Props {
  creatorName: string
  campaigns: CampaignEntry[]
}

const CAMPAIGN_STATUS_LABEL: Record<string, string> = {
  PRE_LAUNCH: "Por lanzar",
  RUNNING: "Activa",
  COMPLETED: "Finalizada",
}

const CAMPAIGN_STATUS_COLOR: Record<string, string> = {
  PRE_LAUNCH: "bg-gray-50 text-gray-600",
  RUNNING: "bg-green-50 text-green-700",
  COMPLETED: "bg-blue-50 text-blue-700",
}

const CREATOR_STATUS_LABEL: Record<string, string> = {
  INVITED: "Invitado",
  ACCEPTED: "Aceptó",
  DECLINED: "Rechazó",
}

const CREATOR_STATUS_COLOR: Record<string, string> = {
  INVITED: "bg-amber-50 text-amber-700",
  ACCEPTED: "bg-green-50 text-green-700",
  DECLINED: "bg-red-50 text-red-700",
}

export function CreatorCampaignsButton({ creatorName, campaigns }: Props) {
  const [open, setOpen] = useState(false)

  if (campaigns.length === 0) {
    return <span className="text-[11px] text-gray-300">—</span>
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="font-mono text-[13px] text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
      >
        {campaigns.length}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <div>
                <h2 className="text-[15px] font-semibold text-gray-900">Campañas</h2>
                <p className="text-[12px] text-gray-400 mt-0.5">{creatorName}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 pb-6 space-y-2 overflow-y-auto">
              {campaigns.map((c) => (
                <div
                  key={c.id}
                  className="border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-gray-900 truncate">{c.name}</p>
                    <p className="text-[11px] text-gray-400 truncate">{c.workspaceName}</p>
                    <p className="text-[10px] text-gray-300 font-mono mt-0.5">
                      {new Date(c.joinedAt).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${CAMPAIGN_STATUS_COLOR[c.campaignStatus] ?? "bg-gray-50 text-gray-500"}`}
                    >
                      {CAMPAIGN_STATUS_LABEL[c.campaignStatus] ?? c.campaignStatus}
                    </span>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${CREATOR_STATUS_COLOR[c.creatorStatus] ?? "bg-gray-50 text-gray-500"}`}
                    >
                      {CREATOR_STATUS_LABEL[c.creatorStatus] ?? c.creatorStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
