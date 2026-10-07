import { site, projects } from '@/data/site'
export const ROOT_LABEL = 'alinerml.devserver'
export const SOCIAL_LINKS = [{label:'github',href:site.github},{label:'contact',href:'/contact/'}]
export const ABOUT_TEXT = [site.name,site.description,site.introduction,...site.interests,site.github].join('\n')
export const NOW_TEXT = projects.map(project => `${project.name} · ${project.focus}`).join('\n')
export const README_TEXT = `${site.title}\nhelp · ls /blog · ls /projects · cat about · search CloudBase`
