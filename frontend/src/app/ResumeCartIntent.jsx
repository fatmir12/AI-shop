import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from './context'
export default function ResumeCartIntent() {
  const { user, add } = useApp()
  const location = useLocation()
  const navigate = useNavigate()
  const handled = useRef(new Set())
  const intent = location.state?.cartIntent
  useEffect(() => {
    if (!user || !intent || /^\/(login|register)/.test(location.pathname) || handled.current.has(intent.id)) return
    handled.current.add(intent.id)
    const state = { ...location.state }
    delete state.cartIntent
    navigate(location.pathname + location.search, { replace: true, state })
    void add(intent.product, intent.quantity).catch(() => {})
  }, [user, intent, add, navigate, location])
  return null
}
