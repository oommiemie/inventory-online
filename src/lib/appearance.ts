import type { Theme } from '@/types'

export interface Prefs {
  appearance: 'light' | 'dark' | 'auto'
  palette: string
  font: string
  bold: boolean
  scale: number
  seasonal: boolean
}

export const DEFAULT_PREFS: Prefs = {
  appearance: 'light', palette: 'sky', font: 'sarabun',
  bold: false, scale: 100, seasonal: false,
}

/** Brand ramps a palette overrides; hero gradient rides along. */
export const PALETTES: {
  id: string; nameKey: string; descKey: string
  swatches: [string, string, string, string]
  vars?: Record<string, string>
}[] = [
  { id: 'sky', nameKey: 'pal.sky', descKey: 'pal.skyDesc',
    swatches: ['#2563EB', '#12275C', '#EEF3FF', '#467AEE'] },
  { id: 'mint', nameKey: 'pal.mint', descKey: 'pal.mintDesc',
    swatches: ['#10B981', '#064E3B', '#ECFDF5', '#34D399'],
    vars: { '--brand-50': '#F0FDF7', '--brand-100': '#DCFCE9', '--brand-200': '#B5F1D3',
            '--brand-300': '#6EE7B7', '--brand-400': '#34D399', '--brand-500': '#10B981',
            '--brand-600': '#059669', '--brand-700': '#047857', '--brand-800': '#065F46',
            '--hero-g1': '#047857', '--hero-g2': '#10A874' } },
  { id: 'aqua', nameKey: 'pal.aqua', descKey: 'pal.aquaDesc',
    swatches: ['#0891B2', '#164E63', '#ECFEFF', '#22D3EE'],
    vars: { '--brand-50': '#F0FDFF', '--brand-100': '#D9F8FE', '--brand-200': '#AFEEFA',
            '--brand-300': '#67E8F9', '--brand-400': '#22D3EE', '--brand-500': '#0891B2',
            '--brand-600': '#0E7490', '--brand-700': '#155E75', '--brand-800': '#164E63',
            '--hero-g1': '#155E75', '--hero-g2': '#0891B2' } },
  { id: 'midnight', nameKey: 'pal.midnight', descKey: 'pal.midnightDesc',
    swatches: ['#4F46E5', '#1E1B4B', '#EEF2FF', '#818CF8'],
    vars: { '--brand-50': '#F5F6FF', '--brand-100': '#E7EAFE', '--brand-200': '#CDD4FC',
            '--brand-300': '#A5B0F8', '--brand-400': '#818CF8', '--brand-500': '#4F46E5',
            '--brand-600': '#4338CA', '--brand-700': '#3730A3', '--brand-800': '#312E81',
            '--hero-g1': '#312E81', '--hero-g2': '#4F46E5' } },
  { id: 'lavender', nameKey: 'pal.lavender', descKey: 'pal.lavenderDesc',
    swatches: ['#9333EA', '#4C1D95', '#FAF5FF', '#C084FC'],
    vars: { '--brand-50': '#FCF8FF', '--brand-100': '#F3E8FF', '--brand-200': '#E4CCFD',
            '--brand-300': '#D8B4FE', '--brand-400': '#C084FC', '--brand-500': '#9333EA',
            '--brand-600': '#7E22CE', '--brand-700': '#6B21A8', '--brand-800': '#581C87',
            '--hero-g1': '#581C87', '--hero-g2': '#8B2FD6' } },
  { id: 'berry', nameKey: 'pal.berry', descKey: 'pal.berryDesc',
    swatches: ['#DB2777', '#831843', '#FDF2F8', '#F472B6'],
    vars: { '--brand-50': '#FEF6FA', '--brand-100': '#FCE7F3', '--brand-200': '#FBCFE8',
            '--brand-300': '#F9A8D4', '--brand-400': '#F472B6', '--brand-500': '#DB2777',
            '--brand-600': '#BE185D', '--brand-700': '#9D174D', '--brand-800': '#831843',
            '--hero-g1': '#9D174D', '--hero-g2': '#D1246E' } },
  /* Pastel pair: softer ramps, primaries kept deep enough to stay legible. */
  { id: 'cream', nameKey: 'pal.cream', descKey: 'pal.creamDesc',
    swatches: ['#A8865A', '#59442C', '#F7F1E6', '#DCC9A8'],
    vars: { '--brand-50': '#FDFBF7', '--brand-100': '#F7F1E6', '--brand-200': '#EDE2CF',
            '--brand-300': '#DCC9A8', '--brand-400': '#C4A57A', '--brand-500': '#A8865A',
            '--brand-600': '#8F6F47', '--brand-700': '#74593A', '--brand-800': '#59442C',
            '--hero-g1': '#8A6A45', '--hero-g2': '#B8956A' } },
  { id: 'sage', nameKey: 'pal.sage', descKey: 'pal.sageDesc',
    swatches: ['#6E9E74', '#36533A', '#F2F8F2', '#B3D0B3'],
    vars: { '--brand-50': '#F6FAF6', '--brand-100': '#EAF3EA', '--brand-200': '#D3E5D3',
            '--brand-300': '#B3D0B3', '--brand-400': '#8FB88F', '--brand-500': '#6E9E74',
            '--brand-600': '#58855E', '--brand-700': '#466B4B', '--brand-800': '#36533A',
            '--hero-g1': '#4F7A55', '--hero-g2': '#82B189' } },
]

export const FONTS: { id: string; name: string; stack: string; defaultFont?: boolean }[] = [
  { id: 'sarabun', name: 'Sarabun', stack: '"Sarabun", Inter, sans-serif', defaultFont: true },
  { id: 'noto',    name: 'Noto Sans Thai',     stack: '"Noto Sans Thai", Inter, sans-serif' },
  { id: 'plex',    name: 'IBM Plex Sans Thai', stack: '"IBM Plex Sans Thai", Inter, sans-serif' },
  { id: 'prompt',  name: 'Prompt',             stack: '"Prompt", Inter, sans-serif' },
  { id: 'kanit',   name: 'Kanit',              stack: '"Kanit", Inter, sans-serif' },
  { id: 'bai',     name: 'Bai Jamjuree',       stack: '"Bai Jamjuree", Inter, sans-serif' },
]

export const resolveTheme = (appearance: Prefs['appearance']): Theme =>
  appearance === 'auto'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : appearance

/** Push every preference into the document. */
export function applyAppearance(p: Prefs) {
  const root = document.documentElement

  root.dataset.theme = resolveTheme(p.appearance)

  const pal = PALETTES.find(x => x.id === p.palette)
  // Clear previous palette overrides, then set the chosen ones.
  for (const P of PALETTES) for (const k of Object.keys(P.vars ?? {})) root.style.removeProperty(k)
  for (const [k, v] of Object.entries(pal?.vars ?? {})) root.style.setProperty(k, v)

  const font = FONTS.find(f => f.id === p.font)
  if (font?.defaultFont) root.style.removeProperty('--font')
  else if (font) root.style.setProperty('--font', font.stack)

  if (p.bold) root.dataset.bold = '1'
  else delete root.dataset.bold

  // Whole-app scaling; zoom keeps layout math intact in Chromium.
  ;(root.style as CSSStyleDeclaration & { zoom?: string }).zoom =
    p.scale === 100 ? '' : String(p.scale / 100)
}
