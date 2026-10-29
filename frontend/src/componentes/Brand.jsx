import { Activity } from "lucide-react";

export default function Brand() {
  return (
    <a className="pm-brand" href="/login" aria-label="ProcessMonitor, inicio">
      <span className="pm-brand__mark"><Activity size={24} strokeWidth={2.4} /></span>
      <span className="pm-brand__name">Sys<span>Monitor</span></span>
    </a>
  );
}
