export const motion = Object.freeze({
  fast: 220,
  hover: 300,
  content: 650,
  page: 500,
  modal: 400,
  modalExit: 250,
  menu: 300,
  chat: 450,
  bar: 500,
  toast: 400,
  feedback: 350,
  typing: 1800,
  skeleton: 2400,
  productEntrance: 650,
  scrollReveal: 700,
  categoryExit: 160,
  categoryEntrance: 440,
  layout: 350,
  stagger: 75,
  maxStagger: 210,
  distance: 8,
  pageDistance: 3,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  entranceEasing: 'cubic-bezier(0.16, 1, 0.3, 1)',
  exitEasing: 'cubic-bezier(0.4, 0, 0.6, 1)',
})
export function applyMotionTokens(element) {
  for (const [name, value] of Object.entries(motion)) {
    const property = name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)
    const unit = name.endsWith('Distance') || name === 'distance' ? 'px' : 'ms'
    element.style.setProperty(`--motion-${property}`, typeof value === 'number' ? `${value}${unit}` : value)
  }
  element.style.setProperty('--motion-ease', motion.easing)
}
