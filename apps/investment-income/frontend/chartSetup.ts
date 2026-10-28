import { BarElement, CategoryScale, Chart, LinearScale, Tooltip } from 'chart.js'
import { FONT_FAMILY, GRID_COLOR, TEXT_COLOR } from './chartTheme'

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip)

Chart.defaults.color = TEXT_COLOR
Chart.defaults.borderColor = GRID_COLOR
Chart.defaults.font.family = FONT_FAMILY
