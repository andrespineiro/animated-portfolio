import type { Project } from '../types'
import { assertProject } from '../validate'
import { asistente } from './asistente'

/** Proyectos del portfolio, en el orden en que aparecen. Se validan al importarse: un dato roto falla en los tests y en arranque, nunca a medias. */
export const PROJECTS: Project[] = [asistente].map(assertProject)
