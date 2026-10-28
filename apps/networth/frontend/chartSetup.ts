import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { FONT_FAMILY, GRID_COLOR, TEXT_COLOR } from './chartTheme'

Chart.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
)

Chart.defaults.color = TEXT_COLOR
Chart.defaults.borderColor = GRID_COLOR
Chart.defaults.font.family = FONT_FAMILY
