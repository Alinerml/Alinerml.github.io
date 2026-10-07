import projectData from './projects.json'

export interface Project {
  id: string
  name: string
  url: string
  linkLabel?: string
  tech: string
  status: string
  description: string
  focus: string
  boundary: string
  group: string
  updated: string
}
export const projects: Project[] = projectData
export const site = {
  title: 'Alinerml · 工程笔记',
  name: 'Alinerml',
  englishName: 'Alinerml',
  nickname: 'Alinerml',
  description: '全栈开发 · AI 工程实践',
  introduction: '把业务流程做顺，把工程证据留下。',
  englishIntroduction: 'Building useful software, with evidence behind every delivery.',
  email: '',
  wechatQr: '',
  github: 'https://github.com/Alinerml',
  url: import.meta.env.PUBLIC_SITE_URL || 'https://Alinerml.github.io',
  interests: ['CRM 与客服工作台', '微信小程序', 'CloudBase', 'AI 辅助开发'],
  contactIntroduction: '欢迎交流业务系统、微信小程序和 AI 工程中的具体问题。'
}
