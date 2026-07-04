import { redirect } from "next/navigation"
import { creatorPath } from "@/lib/host"

export default function EarningsRedirect() {
  redirect(creatorPath("payouts"))
}
