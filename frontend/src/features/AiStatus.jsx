import { aiStatus } from '../utils/conversations'
export default function AiStatus() {
  return <div className="ai-status" role="status" aria-live="polite"><span>{aiStatus()}</span><span className="ai-dots" aria-hidden="true"><i /><i /><i /></span></div>
}
